import React, { useEffect, useRef } from 'react';

interface GraphitePencilCoverCanvasProps {
  imageUrl: string;
  progress?: number; // 0 to 1 animation progress
  className?: string;
}

export const GraphitePencilCoverCanvas: React.FC<GraphitePencilCoverCanvasProps> = ({
  imageUrl,
  progress = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (!isMounted) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Offscreen canvas to sample image pixels
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      // Draw cover photo object-fit cover style
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let renderW = width;
      let renderH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        renderW = height * imgRatio;
        offsetX = (width - renderW) / 2;
      } else {
        renderH = width / imgRatio;
        offsetY = (height - renderH) / 2;
      }

      offCtx.fillStyle = '#F5F0E6'; // Warm ivory background
      offCtx.fillRect(0, 0, width, height);
      offCtx.drawImage(img, offsetX, offsetY, renderW, renderH);

      const imgData = offCtx.getImageData(0, 0, width, height);
      const pixels = imgData.data;

      // 2. Grayscale & Luminance calculation
      const grayscale = new Float32Array(width * height);
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // Standard perceived luminance formula
        grayscale[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      // 3. Sobel Edge Contour Extraction for Graphite Outlines
      const edgeMap = new Float32Array(width * height);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;

          // Sobel Gx
          const gx =
            -1 * grayscale[idx - width - 1] + 1 * grayscale[idx - width + 1] +
            -2 * grayscale[idx - 1]         + 2 * grayscale[idx + 1] +
            -1 * grayscale[idx + width - 1] + 1 * grayscale[idx + width + 1];

          // Sobel Gy
          const gy =
            -1 * grayscale[idx - width - 1] - 2 * grayscale[idx - width] - 1 * grayscale[idx - width + 1] +
             1 * grayscale[idx + width - 1] + 2 * grayscale[idx + width] + 1 * grayscale[idx + width + 1];

          const mag = Math.sqrt(gx * gx + gy * gy);
          edgeMap[idx] = Math.min(255, mag);
        }
      }

      // 4. Render Graphite Pencil Reproduction onto main Canvas
      ctx.clearRect(0, 0, width, height);

      // Base warm ivory background
      ctx.fillStyle = '#F5F0E6';
      ctx.fillRect(0, 0, width, height);

      // Animation phase gating
      const clampedProgress = Math.max(0.05, Math.min(1, progress));

      // Layer A: Soft Graphite Lead Base Wash (Shadow regions)
      ctx.save();
      const baseImageData = ctx.createImageData(width, height);
      const basePixels = baseImageData.data;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const lum = grayscale[idx];
          const pxIdx = idx * 4;

          // Shadow threshold
          if (lum < 180) {
            // Darker areas get more graphite lead dust density
            const darkness = (180 - lum) / 180;
            const alpha = darkness * 0.35 * Math.min(1, clampedProgress * 1.4);

            // Graphite tone (#382E28 to #493D35)
            basePixels[pxIdx] = 56;     // R
            basePixels[pxIdx + 1] = 46; // G
            basePixels[pxIdx + 2] = 40; // B
            basePixels[pxIdx + 3] = Math.floor(alpha * 255);
          } else {
            basePixels[pxIdx + 3] = 0;
          }
        }
      }
      ctx.putImageData(baseImageData, 0, 0);
      ctx.restore();

      // Layer B: Contour Line Outlines (Pencil strokes following edges)
      ctx.save();
      ctx.strokeStyle = '#2E2824';
      ctx.lineWidth = 0.9;
      ctx.globalAlpha = 0.55 * Math.min(1, clampedProgress * 2.0);

      const step = 4;
      for (let y = 2; y < height - 2; y += step) {
        for (let x = 2; x < width - 2; x += step) {
          const idx = y * width + x;
          if (edgeMap[idx] > 45) {
            // Draw tiny organic pencil jitter stroke along contour
            const jitterX = (Math.random() - 0.5) * 1.5;
            const jitterY = (Math.random() - 0.5) * 1.5;
            ctx.beginPath();
            ctx.moveTo(x + jitterX, y + jitterY);
            ctx.lineTo(x + jitterX + (Math.random() * 3 - 1.5), y + jitterY + (Math.random() * 3 - 1.5));
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Layer C: Multi-Directional Hatching Strokes (45deg and -45deg pencil shading)
      if (clampedProgress > 0.2) {
        ctx.save();
        ctx.strokeStyle = '#382E28';
        ctx.lineWidth = 0.75;

        const hatchProgress = Math.min(1, (clampedProgress - 0.2) / 0.8);
        const spacing = 7; // hatch line spacing in px

        // Pass 1: Primary 45-degree diagonal hatching
        ctx.globalAlpha = 0.35 * hatchProgress;
        for (let d = -height; d < width + height; d += spacing) {
          ctx.beginPath();
          let drawnPoints = 0;

          for (let x = Math.max(0, d); x < Math.min(width, d + height); x += 3) {
            const y = x - d;
            if (y >= 0 && y < height) {
              const idx = Math.floor(y) * width + Math.floor(x);
              const lum = grayscale[idx];

              // Only hatch in darker/midtone areas
              if (lum < 160) {
                if (drawnPoints === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x + (Math.random() - 0.5), y + (Math.random() - 0.5));
                drawnPoints++;
              } else if (drawnPoints > 0) {
                ctx.stroke();
                ctx.beginPath();
                drawnPoints = 0;
              }
            }
          }
          if (drawnPoints > 0) ctx.stroke();
        }

        // Pass 2: Secondary -45-degree cross-hatching (Deep shadows)
        if (hatchProgress > 0.4) {
          ctx.globalAlpha = 0.25 * ((hatchProgress - 0.4) / 0.6);
          for (let d = 0; d < width + height; d += spacing * 1.2) {
            ctx.beginPath();
            let drawnPoints = 0;

            for (let x = Math.max(0, d - height); x < Math.min(width, d); x += 3) {
              const y = d - x;
              if (y >= 0 && y < height) {
                const idx = Math.floor(y) * width + Math.floor(x);
                const lum = grayscale[idx];

                if (lum < 100) { // Only in deep shadow zones
                  if (drawnPoints === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x + (Math.random() - 0.5), y + (Math.random() - 0.5));
                  drawnPoints++;
                } else if (drawnPoints > 0) {
                  ctx.stroke();
                  ctx.beginPath();
                  drawnPoints = 0;
                }
              }
            }
            if (drawnPoints > 0) ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Layer D: Construction guidelines (Light compass/pencil rules that fade as drawing completes)
      if (clampedProgress < 0.9) {
        ctx.save();
        ctx.strokeStyle = '#8B735E';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = (1 - clampedProgress) * 0.4;
        ctx.setLineDash([4, 6]);

        // Draw structural rule lines
        ctx.beginPath();
        ctx.moveTo(width * 0.1, height * 0.2);
        ctx.lineTo(width * 0.9, height * 0.2);
        ctx.moveTo(width * 0.1, height * 0.8);
        ctx.lineTo(width * 0.9, height * 0.8);
        ctx.moveTo(width * 0.3, height * 0.05);
        ctx.lineTo(width * 0.3, height * 0.95);
        ctx.moveTo(width * 0.7, height * 0.05);
        ctx.lineTo(width * 0.7, height * 0.95);
        ctx.stroke();

        ctx.restore();
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl, progress]);

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={800}
      className={`w-full h-full object-cover pointer-events-none rounded-3xl ${className}`}
    />
  );
};
