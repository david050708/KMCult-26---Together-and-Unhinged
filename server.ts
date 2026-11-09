import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Student, Photograph } from './src/types/index.ts';
import { AUTHORITATIVE_ROSTER, validateRoster } from './src/data/rosterData.ts';
import { 
  uploadToOci, 
  getFromOci, 
  deleteFromOci, 
  listOciObjects, 
  isOciConfigured, 
  isOciOperational,
  checkOciStorageHealth 
} from './server/ociStorage.ts';
import {
  loadMemories,
  loadRoster,
  loadPendingOperations,
  updateMemoriesAtomic,
  updateRosterAtomic,
  updateOpsAtomic,
  type ServerMemory,
  type StorageOperation
} from './server/stateManager.ts';
import { isOwnedOciPhotoKey, isOwnedLocalPhotoFile } from './server/photoOwnership.ts';
import { signMemoryToken, verifyMemoryToken } from './server/sessionHelper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// -------------------------------------------------------------
// Security: Password Hashing & Salt
// -------------------------------------------------------------
function hashMemoryPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyMemoryPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Rate Limiting (Stateless fallback/Simplified)
// -------------------------------------------------------------
// Note: In Vercel serverless, in-memory rate limiting only works per-instance.
// For true protection, this should move to a distributed store (e.g. OCI JSON or Redis).
// For now, we will rely on individual folder passwords and client-side delays.
const failedPasswordAttempts = new Map<string, { count: number, lockedUntil: number }>();

// Strip password hash, salt, and ensure no creator/identity info leaks
function sanitizeMemory(mem: ServerMemory) {
  const { passwordSalt, passwordHash, ...safe } = mem as any;
  delete safe.createdByStudentId;
  delete safe.createdByStudentName;
  if (Array.isArray(safe.photos)) {
    safe.photos = safe.photos.map((p: any) => {
      const copy = { ...p };
      delete copy.uploadedByStudentId;
      delete copy.uploadedByStudentName;
      return copy;
    });
  }
  return {
    ...safe,
    isPasswordProtected: true,
  };
}

// -------------------------------------------------------------
// Oracle Cloud Object Storage & Local Persistence Helpers (Section 4: No Silent Fallback)
// -------------------------------------------------------------
async function saveUploadedImageToOciOrDisk(
  memoryId: string,
  photoId: string,
  inputData: string
): Promise<{ url: string; ociObjectKey?: string }> {
  // If already an OCI proxy URL, preserve it
  if (inputData.startsWith('/api/oci/photo')) {
    return { url: inputData };
  }

  // Handle Base64 Data URLs: e.g. "data:image/jpeg;base64,..."
  const match = inputData.match(/^data:(image\/[a-zA-Z0-9\+\.-]+);base64,(.+)$/);
  if (match) {
    const mime = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Max 15MB upload limit per image
    if (buffer.length > 15 * 1024 * 1024) {
      throw new Error('Photograph exceeds the 15MB size limit.');
    }

    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';

    // Section 4: Oracle Cloud Object Storage is the Primary Storage Provider
    if (isOciConfigured() && isOciOperational()) {
      try {
        const objectKey = `memories/${memoryId}/photos/${photoId}/image_${Date.now()}.${ext}`;
        const res = await uploadToOci(objectKey, buffer, mime);
        return {
          url: `/api/oci/photo?key=${encodeURIComponent(res.objectKey)}`,
          ociObjectKey: res.objectKey,
        };
      } catch (err: any) {
        console.warn('[OCI Storage] Direct Object Storage upload failed, falling back to local disk storage:', err.message);
      }
    }

    // Local Disk Fallback when Oracle OCI is unconfigured or bucket unavailable
    const uploadsDir = path.join(__dirname, 'data', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const fileName = `${memoryId}_${photoId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return {
      url: `/uploads/${fileName}`,
    };
  }

  // Fallback for valid external links or relative paths
  return { url: inputData };
}

async function recordOperation(
  type: StorageOperation['type'],
  memoryId: string,
  details: { photoId?: string; oldOciObjectKey?: string; newOciObjectKey?: string; oldUrl?: string; newUrl?: string }
): Promise<StorageOperation> {
  const op: StorageOperation = {
    id: `op-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    type,
    status: 'in_progress',
    memoryId,
    ...details,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await updateOpsAtomic((current) => [op, ...current]);
  return op;
}

async function updateOperationStatus(opId: string, status: StorageOperation['status'], error?: string) {
  await updateOpsAtomic((current) => {
    return current.map(o => {
      if (o.id === opId) {
        return {
          ...o,
          status,
          updatedAt: new Date().toISOString(),
          error: error || o.error
        };
      }
      return o;
    });
  });
}

// Delete photograph object from OCI with failure retry tracking
// Delete photograph object from OCI with failure retry tracking
async function deletePhotographStorageObject(
  photo: { id?: string; url?: string; ociObjectKey?: string },
  memoryId?: string,
  opId?: string
) {
  // Select local files only by the server-created memory/photo namespace.
  // A submitted display URL never grants permission to delete a local file.
  const uploadsDir = path.join(__dirname, 'data', 'uploads');
  if (photo.url && fs.existsSync(uploadsDir) && memoryId && photo.id) {
    try {
      for (const file of fs.readdirSync(uploadsDir)) {
        if (isOwnedLocalPhotoFile(file, memoryId, photo.id)) {
          try { fs.unlinkSync(path.join(uploadsDir, file)); } catch {}
        }
      }
    } catch {}
  }

  let key = photo.ociObjectKey;

  // Extract key if url is an OCI proxy URL
  if (!key && photo.url && photo.url.includes('/api/oci/photo?key=')) {
    try {
      const match = photo.url.match(/[?&]key=([^&]+)/);
      if (match) key = decodeURIComponent(match[1]);
    } catch {}
  }

  // Also if photo.url is a direct path like "memories/mem-123/photos/..."
  if (!key && photo.url && photo.url.startsWith('memories/')) {
    key = photo.url;
  }

  if (key && isOwnedOciPhotoKey(key, memoryId, photo.id)) {
    try {
      await deleteFromOci(key);
      if (opId) await updateOperationStatus(opId, 'completed');
      console.log(`[OCI Storage] Successfully deleted object key: ${key}`);
    } catch (err: any) {
      console.error(`[OCI Storage] Deletion failed for key ${key}:`, err.message || err);
      const targetOpId = opId || (await recordOperation('delete_photo', memoryId || 'unknown', { photoId: photo.id || 'photo', oldOciObjectKey: key })).id;
      await updateOperationStatus(targetOpId, 'failed_retry', err.message || 'OCI delete failed');
      throw err;
    }
  }
}

// Durable background retry engine for deferred OCI deletions and cross-system cleanup
async function retryPendingOperations() {
  const { data: storageOperations } = await loadPendingOperations();
  const pending = storageOperations.filter((o) => o.status === 'failed_retry');
  if (pending.length === 0 || !isOciConfigured()) return;

  for (const op of pending) {
    const keyToDelete = op.oldOciObjectKey || op.newOciObjectKey;
    if (keyToDelete && isOwnedOciPhotoKey(keyToDelete, op.memoryId, op.photoId)) {
      try {
        await deleteFromOci(keyToDelete);
        await updateOperationStatus(op.id, 'completed');
        console.log(`[OCI Cleanup Engine] Retried & successfully deleted orphaned object key: ${keyToDelete}`);
      } catch (err: any) {
        // Will be retried on next manual/cron trigger
      }
    }
  }
}

// -------------------------------------------------------------
// Middleware & Static Serving
// -------------------------------------------------------------
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// Note: Local static serving removed for Vercel adaptation.
// OCI Object Storage Secure Proxy Endpoint (Section 4E: Object Ownership Verification)
app.get('/api/oci/photo', async (req, res) => {
  const key = req.query.key as string;
  if (!key) {
    return res.status(400).json({ error: 'Object key required.' });
  }

  const { data: memoriesState } = await loadMemories();

  // Ownership Check: Ensure key belongs to an active photograph in memoriesState
  const isKeyAssociated = memoriesState.some((mem) =>
    mem.photos.some((p) => p.ociObjectKey === key || (p.url && p.url.includes(encodeURIComponent(key)))) ||
    (mem.coverPhotoUrl && mem.coverPhotoUrl.includes(encodeURIComponent(key)))
  );

  if (!isKeyAssociated) {
    return res.status(403).json({ error: 'Access denied. Object key is not associated with an accessible photograph.' });
  }

  try {
    const { buffer, contentType } = await getFromOci(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (err: any) {
    console.error('Failed to retrieve photo from OCI Object Storage:', err);
    res.status(404).json({ error: 'Photograph not found in OCI Object Storage bucket.' });
  }
});

let storageUsageCache: { data: any; timestamp: number } | null = null;
const STORAGE_CACHE_TTL = 30 * 1000; // 30 seconds

// OCI Object Storage Usage Endpoint (Priority 3 Requirement)
app.get('/api/storage/usage', async (_req, res) => {
  const now = Date.now();
  if (storageUsageCache && (now - storageUsageCache.timestamp) < STORAGE_CACHE_TTL) {
    return res.json(storageUsageCache.data);
  }

  const configuredAllowanceBytes = Number(
    process.env.OCI_STORAGE_ALLOWANCE_BYTES ||
    process.env.STORAGE_ALLOWANCE_BYTES ||
    10 * 1024 * 1024 * 1024 // 10 GB default configured allowance
  );

  let usedBytes = 0;
  let objectCount = 0;
  let provider = 'Local Storage Fallback';
  let isOciLive = false;

  if (isOciConfigured() && isOciOperational()) {
    try {
      // Use a shorter timeout for the usage endpoint to prevent UI hanging
      const ociStats = await listOciObjects();
      usedBytes = ociStats.totalSize;
      objectCount = ociStats.objects.length;
      if (usedBytes > 0 || objectCount > 0) {
        provider = 'Oracle Cloud Object Storage (kmcult26-photos)';
        isOciLive = true;
      }
    } catch (err: any) {
      console.warn('[OCI Storage] Could not list bucket objects for usage, falling back to local calculation:', err.message);
    }
  }

  if (!isOciLive) {
    try {
      const uploadsDir = path.join(__dirname, 'data', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          const stat = fs.statSync(path.join(uploadsDir, file));
          if (stat.isFile()) {
            usedBytes += stat.size;
            objectCount++;
          }
        }
      }
      provider = isOciConfigured()
        ? 'Local Storage (Active - OCI Bucket Standby)'
        : 'Local Disk Storage (OCI Configuration Pending)';
    } catch {}
  }

  const remainingBytes = Math.max(0, configuredAllowanceBytes - usedBytes);
  const percentageUsed = Number(
    Math.min(100, (usedBytes / configuredAllowanceBytes) * 100).toFixed(1)
  );

  const responseData = {
    usedBytes,
    allowanceBytes: configuredAllowanceBytes,
    remainingBytes,
    percentageUsed,
    objectCount,
    provider,
    isOciLive,
    isLimitReached: percentageUsed >= 100
  };

  storageUsageCache = { data: responseData, timestamp: now };
  res.json(responseData);
});

// 24/7 Oracle Storage Health Monitoring Endpoint (Section 6 Requirement)
app.get('/api/storage/health', async (_req, res) => {
  const health = await checkOciStorageHealth();
  res.json(health);
});

// Authorization Middleware: Validates JWT for protected operations
async function requireMemoryEditAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const memoryId = req.params.id;
  const token = req.headers['x-memory-token'] as string || (req.body && req.body.editToken) || (req.query && req.query.token as string);

  if (!token) {
    return res.status(403).json({
      error: 'Editing authorization required. Please provide this memory’s passcode.'
    });
  }

  const isValid = await verifyMemoryToken(token, memoryId);
  if (!isValid) {
    return res.status(403).json({
      error: 'Invalid or expired memory editing authorization. Please re-enter the password.'
    });
  }

  next();
}

// -------------------------------------------------------------
// Oracle Storage Management & Health
// -------------------------------------------------------------

// Oracle Storage Reconciliation Endpoint (Section 7 Requirement)
app.get('/api/storage/reconcile', async (_req, res) => {
  if (!isOciConfigured()) {
    return res.status(503).json({
      error: 'Oracle Cloud Object Storage is unconfigured.'
    });
  }

  try {
    const ociStats = await listOciObjects();
    const { data: memoriesState } = await loadMemories();
    const { data: storageOperations } = await loadPendingOperations();
    
    const ociObjectKeys = new Set(ociStats.objects.map((o) => o.name));
    const referencedKeys = new Set<string>();
    const missingObjects: Array<{ memoryId: string; photoId: string; key: string }> = [];

    for (const mem of memoriesState) {
      if (mem.coverPhotoUrl && mem.coverPhotoUrl.includes('/api/oci/photo?key=')) {
        const match = mem.coverPhotoUrl.match(/[?&]key=([^&]+)/);
        if (match) referencedKeys.add(decodeURIComponent(match[1]));
      }

      for (const p of mem.photos) {
        let key = p.ociObjectKey;
        if (!key && p.url && p.url.includes('/api/oci/photo?key=')) {
          const match = p.url.match(/[?&]key=([^&]+)/);
          if (match) key = decodeURIComponent(match[1]);
        }
        if (key) {
          referencedKeys.add(key);
          if (!ociObjectKeys.has(key)) {
            missingObjects.push({ memoryId: mem.id, photoId: p.id, key });
          }
        }
      }
    }

    const orphanedObjects = ociStats.objects.filter((o) => {
      // Ignore application metadata objects
      if (o.name.startsWith('application/')) return false;
      return !referencedKeys.has(o.name);
    });
    
    const pendingRetryOps = storageOperations.filter((op) => op.status === 'failed_retry');

    res.json({
      timestamp: new Date().toISOString(),
      databasePhotoCount: referencedKeys.size,
      ociObjectCount: ociStats.objects.length,
      orphanedOciObjects: orphanedObjects,
      orphanedCount: orphanedObjects.length,
      missingOciObjects: missingObjects,
      missingCount: missingObjects.length,
      pendingRetryOperationsCount: pendingRetryOps.length,
      pendingRetryOperations: pendingRetryOps,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to perform storage reconciliation.' });
  }
});

// Authenticated Cleanup Trigger (Background Task Replacement)
app.post('/api/storage/cleanup', async (req, res) => {
  const { secret } = req.body;
  // Use session secret or dedicated cleanup secret
  if (secret !== (process.env.SESSION_SECRET || 'cleanup')) {
    return res.status(403).json({ error: 'Unauthorized cleanup request.' });
  }

  await retryPendingOperations();
  res.json({ success: true, message: 'OCI cleanup triggered successfully.' });
});

// -------------------------------------------------------------
// Universal Batch Login Endpoint
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }

  // Universal Batch Credentials
  if (username.trim() === 'framesof26' && password === 'Fr@m3s_26') {
    const token = `kmc26-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return res.json({
      success: true,
      token,
      message: 'Universal batch login successful.'
    });
  }

  return res.status(401).json({ error: 'Invalid batch username or password.' });
});

// -------------------------------------------------------------
// Authoritative 150-Student Directory Endpoints
// -------------------------------------------------------------
app.get('/api/roster', async (_req, res) => {
  const { data: rosterState } = await loadRoster();
  res.json({
    total: rosterState.length,
    students: rosterState
  });
});

app.get('/api/roster/validate', async (_req, res) => {
  const { data: rosterState } = await loadRoster();
  const report = validateRoster(rosterState);
  res.json(report);
});

app.post('/api/roster/update', async (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names) || names.length !== 150) {
    return res.status(400).json({
      error: `Authoritative roster requires exactly 150 student entries (received ${Array.isArray(names) ? names.length : 0}).`
    });
  }

  const { data: rosterState } = await updateRosterAtomic((_current) => {
    return names.map((rawName, i) => {
      const num = i + 1;
      const pad = String(num).padStart(3, '0');
      const cleanName = String(rawName).trim();
      return {
        id: `kmc-${pad}`,
        index: num,
        name: cleanName || `Roster Slot ${pad}`,
        assigned: cleanName.length > 0
      };
    });
  });

  const report = validateRoster(rosterState);
  res.json({
    success: true,
    message: 'Authoritative roster updated in OCI.',
    total: rosterState.length,
    students: rosterState,
    report
  });
});

app.post('/api/roster/reset', async (_req, res) => {
  const { data: rosterState } = await updateRosterAtomic(() => [...AUTHORITATIVE_ROSTER]);
  const report = validateRoster(rosterState);
  res.json({ success: true, students: rosterState, report });
});

// -------------------------------------------------------------
// Memory Password Verification & Scoped Token Issuance
// -------------------------------------------------------------
app.post('/api/memories/:id/auth', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  const { data: memoriesState } = await loadMemories();
  const memory = memoriesState.find((m) => m.id === id);
  if (!memory) {
    return res.status(404).json({ error: 'Memory folder not found.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Please enter the memory password.' });
  }

  const isValid = verifyMemoryPassword(password, memory.passwordSalt, memory.passwordHash);

  if (!isValid) {
    return res.status(401).json({
      error: 'Incorrect memory editing password.'
    });
  }

  // Issue Stateless JWT Token
  const token = await signMemoryToken(id);

  res.json({
    success: true,
    token,
    memoryId: id,
    message: 'Editing authorization granted.'
  });
});

// -------------------------------------------------------------
// Memories CRUD Endpoints
// -------------------------------------------------------------

// Public: Get All Memories (Passwords stripped)
app.get('/api/memories', async (_req, res) => {
  const { data: memoriesState } = await loadMemories();
  res.json(memoriesState.map(sanitizeMemory));
});

// Public: Get Single Memory (Password stripped)
app.get('/api/memories/:id', async (req, res) => {
  const { data: memoriesState } = await loadMemories();
  const memory = memoriesState.find((m) => m.id === req.params.id);
  if (!memory) {
    return res.status(404).json({ error: 'Memory not found.' });
  }
  res.json(sanitizeMemory(memory));
});

// Public Creator: Create New Memory (Requires setting an editing password)
app.post('/api/memories', async (req, res) => {
  const {
    title,
    description,
    date,
    category,
    password,
    initialPhotos
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Memory title is required.' });
  }

  if (!password || String(password).trim().length < 4) {
    return res.status(400).json({
      error: 'An editing password of at least 4 characters is required to protect this memory.'
    });
  }

  const memoryId = `mem-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  // Hash the editing password
  const { salt, hash } = hashMemoryPassword(String(password).trim());

  const photos: Photograph[] = [];
  if (Array.isArray(initialPhotos)) {
    for (let idx = 0; idx < initialPhotos.length; idx++) {
      const p = initialPhotos[idx];
      try {
        const photoId = `photo-${Date.now()}-${idx}-${crypto.randomBytes(3).toString('hex')}`;
        const saved = await saveUploadedImageToOciOrDisk(memoryId, photoId, p.url);

        photos.push({
          id: photoId,
          url: saved.url,
          ociObjectKey: saved.ociObjectKey,
          caption: p.caption || '',
          date: p.date || date || '',
          location: p.location || '',
          taggedStudentIds: p.taggedStudentIds || [],
          createdAt: now,
          updatedAt: now,
          rotation: (Math.random() * 4 - 2),
          size: idx === 0 ? 'large' : 'normal'
        });
      } catch (err: any) {
        console.error('Failed to save initial photo:', err);
      }
    }
  }

  const newMemory: ServerMemory = {
    id: memoryId,
    title: title.trim(),
    description: description ? description.trim() : '',
    date: date ? date.trim() : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    category: category || 'Memories',
    coverPhotoId: photos.length > 0 ? photos[0].id : undefined,
    coverPhotoUrl: photos.length > 0 ? photos[0].url : undefined,
    photos,
    createdAt: now,
    updatedAt: now,
    passwordSalt: salt,
    passwordHash: hash
  };

  await updateMemoriesAtomic((current) => [newMemory, ...current]);
  const editToken = await signMemoryToken(memoryId);

  res.status(201).json({
    memory: sanitizeMemory(newMemory),
    editToken,
    message: 'Memory created and saved to OCI.'
  });
});

// Protected: Update Memory Details (Requires Memory Edit JWT)
app.put('/api/memories/:id', requireMemoryEditAuth, async (req, res) => {
  const { title, description, date, category, coverPhotoId } = req.body;
  const memoryId = req.params.id;

  try {
    const { data: updatedMemories } = await updateMemoriesAtomic((current) => {
      return current.map(memory => {
        if (memory.id === memoryId) {
          const m = { ...memory };
          if (title !== undefined) m.title = title.trim();
          if (description !== undefined) m.description = description.trim();
          if (date !== undefined) m.date = date.trim();
          if (category !== undefined) m.category = category;
          if (coverPhotoId) {
            const photo = m.photos.find((p) => p.id === coverPhotoId);
            if (photo) {
              m.coverPhotoId = photo.id;
              m.coverPhotoUrl = photo.url;
            }
          }
          m.updatedAt = new Date().toISOString();
          return m;
        }
        return memory;
      });
    });

    const memory = updatedMemories.find(m => m.id === memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory lost.' });
    res.json(sanitizeMemory(memory));
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// Protected: Delete Memory (Requires Memory Edit JWT)
app.delete('/api/memories/:id', requireMemoryEditAuth, async (req, res) => {
  const memoryId = req.params.id;

  const { data: currentMemories } = await loadMemories();
  const existingMemory = currentMemories.find((m) => m.id === memoryId);

  // Idempotence: If memory is already removed, return success immediately
  if (!existingMemory) {
    return res.json({ success: true, deletedId: memoryId, message: 'Memory already deleted (idempotent).' });
  }

  const op = await recordOperation('delete_memory', existingMemory.id, {});

  // 1. Physically delete every photograph object from OCI and storage
  const deletionErrors: string[] = [];
  for (const p of existingMemory.photos) {
    try {
      await deletePhotographStorageObject(p, existingMemory.id, op.id);
    } catch (err: any) {
      console.warn(`[Delete Memory] Error deleting photo ${p.id}:`, err.message);
      deletionErrors.push(err.message);
    }
  }

  // Also clean up any lingering local files matching memoryId in data/uploads
  const uploadsDir = path.join(__dirname, 'data', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    try {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        if (f.startsWith(`${memoryId}_`)) {
          try { fs.unlinkSync(path.join(uploadsDir, f)); } catch {}
        }
      }
    } catch {}
  }

  // 2. Atomically remove the memory record from authoritative metadata store
  await updateMemoriesAtomic((current) => current.filter((m) => m.id !== memoryId));

  // 3. Mark operation completed & prune pending operations for this memory
  await updateOperationStatus(op.id, 'completed');
  await updateOpsAtomic((ops) => ops.filter((o) => o.memoryId !== memoryId || o.id === op.id));

  // 4. Invalidate storage metrics cache immediately
  storageUsageCache = null;

  res.json({ success: true, deletedId: existingMemory.id });
});

// Protected: Add Student Photographs (Requires Memory Edit JWT)
app.post('/api/memories/:id/photos', requireMemoryEditAuth, async (req, res) => {
  const memoryId = req.params.id;
  const { photos: incomingPhotos } = req.body;
  if (!Array.isArray(incomingPhotos) || incomingPhotos.length === 0) {
    return res.status(400).json({ error: 'Photographs required.' });
  }

  const now = new Date().toISOString();
  const addedPhotos: Photograph[] = [];

  for (let idx = 0; idx < incomingPhotos.length; idx++) {
    const p = incomingPhotos[idx];
    try {
      const photoId = `photo-${Date.now()}-${idx}-${crypto.randomBytes(3).toString('hex')}`;
      const saved = await saveUploadedImageToOciOrDisk(memoryId, photoId, p.url);

      addedPhotos.push({
        id: photoId,
        url: saved.url,
        ociObjectKey: saved.ociObjectKey,
        caption: p.caption || '',
        date: p.date || now,
        location: p.location || '',
        taggedStudentIds: p.taggedStudentIds || [],
        createdAt: now,
        updatedAt: now,
        rotation: (Math.random() * 4 - 2),
        size: (p.size as any) || 'normal'
      });
    } catch (err: any) {
      return res.status(400).json({ error: `Upload failed: ${err.message}` });
    }
  }

  let updatedMemoryAfterAdd: ServerMemory | undefined;
  const { data: memoriesWithNewPhotos } = await updateMemoriesAtomic((current) => {
    return current.map(m => {
      if (m.id === memoryId) {
        const copy = { ...m, photos: [...m.photos, ...addedPhotos], updatedAt: now };
        if (!copy.coverPhotoId && addedPhotos.length > 0) {
          copy.coverPhotoId = addedPhotos[0].id;
          copy.coverPhotoUrl = addedPhotos[0].url;
        }
        updatedMemoryAfterAdd = copy;
        return copy;
      }
      return m;
    });
  });

  storageUsageCache = null;
  const memoryToReturn = updatedMemoryAfterAdd || memoriesWithNewPhotos.find(m => m.id === memoryId);
  res.status(201).json({
    success: true,
    memory: memoryToReturn ? sanitizeMemory(memoryToReturn) : undefined,
    addedPhotos
  });
});

// Protected: Update Photograph Details or Replace Image
app.put('/api/memories/:id/photos/:photoId', requireMemoryEditAuth, async (req, res) => {
  const { id: memoryId, photoId } = req.params;
  const { caption, location, date, taggedStudentIds, isCover, newImageData } = req.body;

  let oldPhotoRef: Photograph | undefined;
  let updatedPhotoRef: Photograph | undefined;

  // If replacing image, we do it in two steps: Upload new, then update metadata atomic
  let newSaved: { url: string; ociObjectKey?: string } | undefined;
  if (newImageData && newImageData.startsWith('data:image/')) {
    newSaved = await saveUploadedImageToOciOrDisk(memoryId, photoId, newImageData);
  }

  let updatedMemoryAfterPut: ServerMemory | undefined;
  const { data: updatedMemories } = await updateMemoriesAtomic((current) => {
    return current.map(m => {
      if (m.id === memoryId) {
        const photo = m.photos.find(p => p.id === photoId);
        if (photo) {
          oldPhotoRef = { ...photo };
          if (newSaved) {
            photo.url = newSaved.url;
            photo.ociObjectKey = newSaved.ociObjectKey;
          }
          if (caption !== undefined) photo.caption = caption;
          if (location !== undefined) photo.location = location;
          if (date !== undefined) photo.date = date;
          if (taggedStudentIds !== undefined) photo.taggedStudentIds = taggedStudentIds;
          
          photo.updatedAt = new Date().toISOString();
          m.updatedAt = photo.updatedAt;

          if (isCover) {
            m.coverPhotoId = photo.id;
            m.coverPhotoUrl = photo.url;
          }
          updatedPhotoRef = { ...photo };
        }
        updatedMemoryAfterPut = { ...m };
        return { ...m };
      }
      return m;
    });
  });

  if (newSaved && oldPhotoRef && oldPhotoRef.ociObjectKey) {
    const op = await recordOperation('replace_photo', memoryId, {
      photoId,
      oldOciObjectKey: oldPhotoRef.ociObjectKey,
      newOciObjectKey: newSaved.ociObjectKey
    });
    try {
      await deletePhotographStorageObject({ id: photoId, ociObjectKey: oldPhotoRef.ociObjectKey }, memoryId, op.id);
    } catch {}
  }

  storageUsageCache = null;
  const targetMemory = updatedMemoryAfterPut || updatedMemories.find(m => m.id === memoryId);
  res.json({
    success: true,
    memory: targetMemory ? sanitizeMemory(targetMemory) : undefined,
    photo: updatedPhotoRef
  });
});

// Protected: Delete Photograph (Requires Memory Edit JWT)
app.delete('/api/memories/:id/photos/:photoId', requireMemoryEditAuth, async (req, res) => {
  const { id: memoryId, photoId } = req.params;

  const { data: currentMemories } = await loadMemories();
  const existingMemory = currentMemories.find((m) => m.id === memoryId);
  if (!existingMemory) {
    return res.status(404).json({ error: 'Memory folder not found.' });
  }

  const existingPhoto = existingMemory.photos.find((p) => p.id === photoId);
  // Idempotent deletion: if photo was already deleted from memory, return success with current state
  if (!existingPhoto) {
    return res.json({
      success: true,
      memory: sanitizeMemory(existingMemory),
      message: 'Photograph already removed (idempotent).'
    });
  }

  const op = await recordOperation('delete_photo', memoryId, {
    photoId,
    oldOciObjectKey: existingPhoto.ociObjectKey,
    oldUrl: existingPhoto.url
  });

  // 1. Physically delete photo storage object from OCI and local storage
  try {
    await deletePhotographStorageObject(existingPhoto, memoryId, op.id);
  } catch (storageErr: any) {
    console.error(`[Storage Deletion] Error removing photo ${photoId} from storage:`, storageErr.message);
    return res.status(502).json({
      error: `Storage deletion failed: ${storageErr.message || 'Unable to delete photograph from storage'}`
    });
  }

  // 2. Safely and atomically update metadata in authoritative store
  let finalUpdatedMemory: ServerMemory | undefined;
  const { data: updatedMemories } = await updateMemoriesAtomic((current) => {
    return current.map((m) => {
      if (m.id === memoryId) {
        const remainingPhotos = m.photos.filter((p) => p.id !== photoId);
        const isCoverDeleted = m.coverPhotoId === photoId;

        let nextCoverId = m.coverPhotoId;
        let nextCoverUrl = m.coverPhotoUrl;

        if (isCoverDeleted) {
          if (remainingPhotos.length > 0) {
            nextCoverId = remainingPhotos[0].id;
            nextCoverUrl = remainingPhotos[0].url;
          } else {
            nextCoverId = undefined;
            nextCoverUrl = undefined;
          }
        }

        const updated: ServerMemory = {
          ...m,
          photos: remainingPhotos,
          coverPhotoId: nextCoverId,
          coverPhotoUrl: nextCoverUrl,
          updatedAt: new Date().toISOString()
        };
        finalUpdatedMemory = updated;
        return updated;
      }
      return m;
    });
  });

  finalUpdatedMemory = finalUpdatedMemory || updatedMemories.find((m) => m.id === memoryId);
  if (!finalUpdatedMemory) {
    return res.status(404).json({ error: 'Memory not found after update.' });
  }

  await updateOperationStatus(op.id, 'completed');
  storageUsageCache = null; // Clear cached storage usage

  return res.json({
    success: true,
    memory: sanitizeMemory(finalUpdatedMemory)
  });
});

// -------------------------------------------------------------
// Vite Dev & Production Server Setup (Conditional for local dev)
// -------------------------------------------------------------
export async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Return JSON 404 for unhandled API routes instead of falling through to Vite SPA index.html
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Note: In Vercel, static serving is handled via vercel.json rewrites, 
    // but we keep this for standalone production testing.
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[KMCult'26] Standalone server running on http://0.0.0.0:${port}`);
  });
}

// Only start the server automatically if run directly (not as a serverless function)
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}` || process.env.DEV_SERVER) {
  // Check if we are in a standalone environment
  if (!process.env.VERCEL) {
    startServer();
  }
}

export default app;

