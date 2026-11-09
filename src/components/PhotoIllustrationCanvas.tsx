import React, { useEffect, useRef, useState } from 'react';
import type { Photograph } from '../types/index.ts';
import { uploadArtworkToMemory } from '../services/api.ts';

// In-memory cache for reconstructed illustration data URLs across sessions/views
const illustrationMemoryCache = new Map<string, string>();

export function getCachedIllustration(photoId: string): string | undefined {
  if (illustrationMemoryCache.has(photoId)) {
    return illustrationMemoryCache.get(photoId);
  }
  try {
    const stored = sessionStorage.getItem(`kmc26_illus_${photoId}`);
    if (stored) {
      illustrationMemoryCache.set(photoId, stored);
      return stored;
    }
  } catch {}
  return undefined;
}

export function setCachedIllustration(photoId: string, dataUrl: string): void {
  illustrationMemoryCache.set(photoId, dataUrl);
  try {
    if (dataUrl.length < 1500000) {
      sessionStorage.setItem(`kmc26_illus_${photoId}`, dataUrl);
    }
  } catch {}
}

export type IllustrationStage = 'blank' | 'sketch' | 'refining' | 'coloring' | 'shading' | 'finished';

interface PhotoIllustrationCanvasProps {
  photo: Photograph;
  stage: IllustrationStage;
  progress: number;
  memoryId?: string;
  mode?: 'original' | 'oil_painting' | 'legacy';
  onIllustrationReady?: (photoId: string, dataUrl: string) => void;
  className?: string;
  interactive?: boolean;
}

export const PhotoIllustrationCanvas: React.FC<PhotoIllustrationCanvasProps> = ({
  photo,
  stage,
  progress,
  memoryId,
  mode,
  onIllustrationReady,
  className = '',
  interactive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(() => photo.artworkUrl || getCachedIllustration(photo.id));

  // Determine active reconstruction mode (defaults to photo.reconstructionMode or 'oil_painting')
  const activeMode: 'original' | 'oil_painting' = (
    mode === 'original' || photo.reconstructionMode === 'original'
  ) ? 'original' : 'oil_painting';

  const analysisRef = useRef<{
    width: number;
    height: number;
    edgeMap: Float32Array;
    grayscale: Float32Array;
    pixelColors: Uint8ClampedArray;
    angleMap: Float32Array;
    luminanceMap: Float32Array;
    skinMask: Uint8Array;
    facialFeatureMask: Uint8Array;
    qualityScore: number;
  } | null>(null);

  useEffect(() => {
    const existing = photo.artworkUrl || getCachedIllustration(photo.id);
    if (existing) {
      setCachedUrl(existing);
    }
  }, [photo.id, photo.artworkUrl]);

  // Multiscale Reference-Guided Offscreen Analysis Pipeline
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Hidden reference photo used strictly for offscreen analysis
    img.src = photo.url;

    img.onload = () => {
      if (!isMounted) return;

      const w = 1040;
      const h = 780;

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let rw = w;
      let rh = h;
      let ox = 0;
      let oy = 0;

      if (imgRatio > canvasRatio) {
        rw = h * imgRatio;
        ox = (w - rw) / 2;
      } else {
        rh = w / imgRatio;
        oy = (h - rh) / 2;
      }

      offCtx.fillStyle = '#FAF6EE';
      offCtx.fillRect(0, 0, w, h);
      offCtx.drawImage(img, ox, oy, rw, rh);

      const imgData = offCtx.getImageData(0, 0, w, h);
      const px = imgData.data;

      const grayscale = new Float32Array(w * h);
      const luminanceMap = new Float32Array(w * h);
      const skinMask = new Uint8Array(w * h);
      const facialFeatureMask = new Uint8Array(w * h);

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const idx = i / 4;
        grayscale[idx] = lum;
        luminanceMap[idx] = lum / 255;

        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          (Math.max(r, g, b) - Math.min(r, g, b)) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b
        );
        if (isSkin) skinMask[idx] = 1;
      }

      const edgeMap = new Float32Array(w * h);
      const angleMap = new Float32Array(w * h);

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx =
            -1 * grayscale[idx - w - 1] + 1 * grayscale[idx - w + 1] +
            -2 * grayscale[idx - 1]     + 2 * grayscale[idx + 1] +
            -1 * grayscale[idx + w - 1] + 1 * grayscale[idx + w + 1];

          const gy =
            -1 * grayscale[idx - w - 1] - 2 * grayscale[idx - w] - 1 * grayscale[idx - w + 1] +
             1 * grayscale[idx + w - 1] + 2 * grayscale[idx + w] + 1 * grayscale[idx + w + 1];

          const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
          edgeMap[idx] = mag;
          angleMap[idx] = Math.atan2(gy, gx) + Math.PI / 2;

          if (mag > 42 && (skinMask[idx] === 1 || skinMask[idx - 1] === 1 || skinMask[idx + 1] === 1)) {
            facialFeatureMask[idx] = 1;
          }
        }
      }

      analysisRef.current = {
        width: w,
        height: h,
        edgeMap,
        grayscale,
        pixelColors: px,
        angleMap,
        luminanceMap,
        skinMask,
        facialFeatureMask,
        qualityScore: 0.98
      };

      if (activeMode === 'original') {
        renderOriginalPhotographicReconstruction();
      } else {
        renderHighFidelityOilPainting();
      }
    };

    return () => {
      isMounted = false;
    };
  }, [photo.url, activeMode]);

  // PIPELINE 1: Original Photographic Reconstruction Engine (Natural Photo Fidelity, NO Oil Effects)
  const renderOriginalPhotographicReconstruction = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Smooth clean warm white base (No canvas weave grain)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, w, h);

    if (stage === 'blank') {
      ctx.strokeStyle = 'rgba(139, 115, 94, 0.2)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0); ctx.lineTo(w * 0.25, h);
      ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h);
      ctx.moveTo(0, h * 0.33); ctx.lineTo(w, h * 0.33);
      ctx.moveTo(0, h * 0.66); ctx.lineTo(w, h * 0.66);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const data = analysisRef.current;
    if (!data) return;

    const { edgeMap, grayscale, pixelColors } = data;
    const effectiveProgress = (stage as string) === 'finished' ? 1 : Math.max(0.1, progress);

    // Stage 1 & 2: Structural Sketch Pass (Graphite Contours)
    if (stage === 'sketch' || stage === 'refining' || stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const sketchProgress = stage === 'sketch' ? effectiveProgress : 1;
      ctx.save();
      ctx.strokeStyle = '#382E28';
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.7 * sketchProgress;

      const step = 4;
      for (let y = 4; y < h - 4; y += step) {
        for (let x = 4; x < w - 4; x += step) {
          const idx = y * w + x;
          if (edgeMap[idx] > 38) {
            ctx.beginPath();
            ctx.arc(x, y, 0.8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Stage 3 & 4: Photographic Detail Pigment Wash (High-Density Pixel-Faithful Reconstruction)
    if (stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const colorProgress = stage === 'coloring' ? effectiveProgress : 1;
      ctx.save();
      ctx.globalAlpha = 0.95 * colorProgress;

      // Fine step 2px sampling for sharp photographic accuracy
      const step = 2;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = pixelColors[idx];
          const g = pixelColors[idx + 1];
          const b = pixelColors[idx + 2];

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x, y, step, step);
        }
      }
      ctx.restore();
    }

    // Stage 4: Photographic Edge Refinement & Tonal Transitions
    if (stage === 'refining' || stage === 'shading' || (stage as string) === 'finished') {
      const refineProgress = stage === 'refining' ? effectiveProgress : 1;
      ctx.save();
      ctx.strokeStyle = '#1E1814';
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.5 * refineProgress;

      const step = 2;
      for (let y = 2; y < h - 2; y += step) {
        for (let x = 2; x < w - 2; x += step) {
          const idx = y * w + x;
          if (edgeMap[idx] > 60) {
            ctx.beginPath();
            ctx.arc(x, y, 0.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Active Swarm Drawing Cursors during reconstruction
    if ((stage as string) !== 'finished' && (stage as string) !== 'blank') {
      ctx.save();
      const activeAgentsCount = 4;
      const timeFactor = Date.now() * 0.005;

      for (let a = 0; a < activeAgentsCount; a++) {
        const cx = (0.2 + 0.6 * ((Math.sin(timeFactor + a * 1.57) + 1) / 2)) * w;
        const cy = (0.2 + 0.6 * ((Math.cos(timeFactor * 0.8 + a * 1.57) + 1) / 2)) * h;

        ctx.fillStyle = '#382E28';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FAF6EE';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Stage 5: Finished Output Export & Persistence
    if ((stage as string) === 'finished') {
      ctx.save();
      ctx.strokeStyle = 'rgba(73, 61, 53, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.restore();

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCachedIllustration(photo.id, dataUrl);
        setCachedUrl(dataUrl);

        if (onIllustrationReady) {
          onIllustrationReady(photo.id, dataUrl);
        }

        if (memoryId && (!photo.artworkUrl || !photo.artworkUrl.startsWith('/api/oci/photo'))) {
          uploadArtworkToMemory(memoryId, photo.id, dataUrl).then((res) => {
            if (res.success && res.artworkUrl) {
              setCachedIllustration(photo.id, res.artworkUrl);
              setCachedUrl(res.artworkUrl);
            }
          }).catch(() => {});
        }
      } catch {}
    }
  };

  // PIPELINE 2: Natural Oil Painting Reconstruction Engine (Visible Impasto, Canvas Texture)
  const renderHighFidelityOilPainting = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Cold-Pressed Linen Canvas Weave Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, w, h);

    // Canvas Weave (Warp & Weft threads)
    ctx.fillStyle = 'rgba(73, 61, 53, 0.025)';
    for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

    // Canvas linen flecks
    ctx.fillStyle = 'rgba(120, 100, 85, 0.04)';
    for (let i = 0; i < 900; i++) {
      const rx = (Math.sin(i * 883) * 0.5 + 0.5) * w;
      const ry = (Math.cos(i * 443) * 0.5 + 0.5) * h;
      ctx.fillRect(rx, ry, 2.0, 1.5);
    }

    if (stage === 'blank') {
      ctx.strokeStyle = 'rgba(139, 115, 94, 0.2)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0); ctx.lineTo(w * 0.25, h);
      ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h);
      ctx.moveTo(0, h * 0.33); ctx.lineTo(w, h * 0.33);
      ctx.moveTo(0, h * 0.66); ctx.lineTo(w, h * 0.66);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const data = analysisRef.current;
    if (!data) return;

    const { edgeMap, grayscale, pixelColors, angleMap, skinMask, facialFeatureMask } = data;
    const effectiveProgress = (stage as string) === 'finished' ? 1 : Math.max(0.1, progress);

    // 2. Base Pigment Oil Wash (Underpainting Pass)
    if (stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const colorProgress = stage === 'coloring' ? effectiveProgress : 1;
      const step = 5;
      ctx.save();
      ctx.globalAlpha = 0.82 * colorProgress;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = pixelColors[idx];
          const g = pixelColors[idx + 1];
          const b = pixelColors[idx + 2];
          const lum = grayscale[y * w + x];

          let pr = r;
          let pg = g;
          let pb = b;

          if (lum < 95) {
            pr = Math.floor(r * 0.88 + 18);
            pg = Math.floor(g * 0.84 + 14);
            pb = Math.floor(b * 0.9 + 22);
          } else if (lum > 215) {
            pr = Math.min(255, r + 12);
            pg = Math.min(255, g + 10);
            pb = Math.min(255, b + 4);
          }

          ctx.fillStyle = `rgb(${pr}, ${pg}, ${pb})`;
          const jx = (Math.sin(x * 7.1 + y * 3.3) * 1.2);
          const jy = (Math.cos(x * 3.3 + y * 7.1) * 1.2);
          ctx.beginPath();
          ctx.arc(x + jx, y + jy, 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 3. Level 3 Multiscale Material-Aware Oil Impasto & Facial Identity Preservation
    if (stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const impastoProgress = stage === 'coloring' ? effectiveProgress : 1;
      ctx.save();
      ctx.globalAlpha = 0.9 * impastoProgress;

      for (let y = 2; y < h - 2; y += 3) {
        for (let x = 2; x < w - 2; x += 3) {
          const pIdx = y * w + x;
          const pxIdx = pIdx * 4;
          const r = pixelColors[pxIdx];
          const g = pixelColors[pxIdx + 1];
          const b = pixelColors[pxIdx + 2];
          const edge = edgeMap[pIdx];
          const angle = angleMap[pIdx];

          const isSkin = skinMask[pIdx] === 1;
          const isFacialDetail = facialFeatureMask[pIdx] === 1;

          if (isFacialDetail) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
            ctx.beginPath();
            ctx.arc(x, y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (isSkin) {
            ctx.fillStyle = `rgba(${Math.min(255, r + 6)}, ${Math.min(255, g + 4)}, ${Math.max(0, b - 2)}, 0.75)`;
            ctx.beginPath();
            ctx.ellipse(x, y, 2.8, 1.9, angle, 0, Math.PI * 2);
            ctx.fill();
          } else if (edge > 40) {
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
            ctx.lineWidth = 1.8;
            const strokeLen = 5.5;
            const dx = Math.cos(angle) * strokeLen;
            const dy = Math.sin(angle) * strokeLen;

            ctx.beginPath();
            ctx.moveTo(x - dx / 2, y - dy / 2);
            ctx.lineTo(x + dx / 2, y + dy / 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctx.beginPath();
            ctx.ellipse(x, y, 3.5, 2.2, angle, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // 4. Inking & Fine Contour Pass
    if (stage === 'sketch' || stage === 'refining' || stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const sketchProgress = stage === 'sketch' ? effectiveProgress : 1;
      ctx.save();
      ctx.strokeStyle = '#322822';
      ctx.lineWidth = 1.25;
      ctx.globalAlpha = 0.78 * sketchProgress;

      const step = 3;
      for (let y = 3; y < h - 3; y += step) {
        for (let x = 3; x < w - 3; x += step) {
          const idx = y * w + x;
          if (edgeMap[idx] > 34) {
            const angle = angleMap[idx];
            const dx = Math.cos(angle) * 3.2;
            const dy = Math.sin(angle) * 3.2;

            ctx.beginPath();
            ctx.moveTo(x - dx, y - dy);
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 5. Refinement & Detail Pass
    if (stage === 'refining' || stage === 'coloring' || stage === 'shading' || (stage as string) === 'finished') {
      const refineProgress = stage === 'refining' ? effectiveProgress : 1;
      ctx.save();
      ctx.strokeStyle = '#1E1814';
      ctx.lineWidth = 0.85;
      ctx.globalAlpha = 0.88 * refineProgress;

      const step = 2;
      for (let y = 2; y < h - 2; y += step) {
        for (let x = 2; x < w - 2; x += step) {
          const idx = y * w + x;
          if (facialFeatureMask[idx] === 1 || edgeMap[idx] > 52) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 6. Natural Tonal Shading Pass
    if (stage === 'shading' || (stage as string) === 'finished') {
      const shadeProgress = stage === 'shading' ? effectiveProgress : 1;
      ctx.save();
      ctx.strokeStyle = '#261F1A';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.38 * shadeProgress;

      const spacing = 8;
      for (let d = -h; d < w + h; d += spacing) {
        ctx.beginPath();
        let inStroke = false;

        for (let x = Math.max(0, d); x < Math.min(w, d + h); x += 4) {
          const y = x - d;
          if (y >= 0 && y < h) {
            const idx = Math.floor(y) * w + Math.floor(x);
            const lum = grayscale[idx];
            if (lum < 130) {
              if (!inStroke) {
                ctx.moveTo(x, y);
                inStroke = true;
              } else {
                ctx.lineTo(x, y);
              }
            } else if (inStroke) {
              ctx.stroke();
              ctx.beginPath();
              inStroke = false;
            }
          }
        }
        if (inStroke) ctx.stroke();
      }
      ctx.restore();
    }

    // Active Swarm Drawing Cursors during reconstruction
    if ((stage as string) !== 'finished' && (stage as string) !== 'blank') {
      ctx.save();
      const activeAgentsCount = 4;
      const timeFactor = Date.now() * 0.005;

      for (let a = 0; a < activeAgentsCount; a++) {
        const cx = (0.2 + 0.6 * ((Math.sin(timeFactor + a * 1.57) + 1) / 2)) * w;
        const cy = (0.2 + 0.6 * ((Math.cos(timeFactor * 0.8 + a * 1.57) + 1) / 2)) * h;

        ctx.fillStyle = a % 2 === 0 ? '#493D35' : '#66715C';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FAF6EE';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Finished Stage: Export & OCI Persistence Sync
    if ((stage as string) === 'finished') {
      ctx.save();
      ctx.strokeStyle = 'rgba(73, 61, 53, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.restore();

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCachedIllustration(photo.id, dataUrl);
        setCachedUrl(dataUrl);

        if (onIllustrationReady) {
          onIllustrationReady(photo.id, dataUrl);
        }

        if (memoryId && (!photo.artworkUrl || !photo.artworkUrl.startsWith('/api/oci/photo'))) {
          uploadArtworkToMemory(memoryId, photo.id, dataUrl).then((res) => {
            if (res.success && res.artworkUrl) {
              setCachedIllustration(photo.id, res.artworkUrl);
              setCachedUrl(res.artworkUrl);
            }
          }).catch(() => {});
        }
      } catch {}
    }
  };

  useEffect(() => {
    if ((stage as string) === 'finished' && cachedUrl) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cachedUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      return;
    }

    if (activeMode === 'original') {
      renderOriginalPhotographicReconstruction();
    } else {
      renderHighFidelityOilPainting();
    }
  }, [stage, progress, cachedUrl, activeMode]);

  return (
    <canvas
      ref={canvasRef}
      width={1040}
      height={780}
      className={`w-full h-full object-cover rounded-xs border border-[#493D35]/30 ${className}`}
      style={{
        imageRendering: 'auto',
        cursor: interactive ? 'pointer' : 'default',
      }}
    />
  );
};
