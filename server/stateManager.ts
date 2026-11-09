import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJsonFromOci, putJsonToOci, isOciOperational } from './ociStorage.ts';
import { AUTHORITATIVE_ROSTER } from '../src/data/rosterData.ts';
import type { Student, Photograph } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Metadata object structures in OCI
 */

export interface StorageOperation {
  id: string;
  type: 'add_photo' | 'replace_photo' | 'delete_photo' | 'delete_memory';
  status: 'pending' | 'in_progress' | 'completed' | 'failed_retry';
  memoryId: string;
  photoId?: string;
  oldOciObjectKey?: string;
  newOciObjectKey?: string;
  oldUrl?: string;
  newUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMemory {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  photos: Photograph[];
  createdAt: string;
  updatedAt: string;
  passwordSalt: string;
  passwordHash: string;
}

const PATHS = {
  MEMORIES: 'application/memories.json',
  ROSTER: 'application/roster.json',
  OPS: 'application/pendingOperations.json',
};

function readLocalJson<T>(filename: string, fallback: T): T {
  try {
    const fullPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8').trim();
      if (content) {
        return JSON.parse(content) as T;
      }
    }
  } catch (err) {
    console.warn(`[StateManager] Failed to read local ${filename}:`, err);
  }
  return fallback;
}

function writeLocalJson<T>(filename: string, data: T): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const fullPath = path.join(DATA_DIR, filename);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[StateManager] Failed to write local ${filename}:`, err);
  }
}

/**
 * Loads the latest memories from OCI or local storage
 */
export async function loadMemories(): Promise<{ data: ServerMemory[]; etag: string }> {
  if (isOciOperational()) {
    try {
      const result = await getJsonFromOci<ServerMemory[]>(PATHS.MEMORIES);
      if (result) {
        writeLocalJson('memories.json', result.data);
        return result;
      }
    } catch (err: any) {
      console.warn('[StateManager] Could not load memories from OCI, falling back to local file:', err?.message || err);
    }
  }
  const local = readLocalJson<ServerMemory[]>('memories.json', []);
  return { data: local, etag: 'local-' + Date.now() };
}

/**
 * Saves memories to OCI and local storage
 */
export async function saveMemories(data: ServerMemory[], ifMatch?: string): Promise<string> {
  writeLocalJson('memories.json', data);
  if (isOciOperational()) {
    try {
      const { etag } = await putJsonToOci(PATHS.MEMORIES, data, ifMatch);
      return etag;
    } catch (err: any) {
      console.warn('[StateManager] Failed to save memories to OCI, saved to local disk:', err.message);
    }
  }
  return 'local-' + Date.now();
}

/**
 * Loads the roster from OCI or local storage
 */
export async function loadRoster(): Promise<{ data: Student[]; etag: string }> {
  if (isOciOperational()) {
    try {
      const result = await getJsonFromOci<Student[]>(PATHS.ROSTER);
      if (result) {
        writeLocalJson('roster.json', result.data);
        return result;
      }
    } catch (err: any) {
      console.warn('[StateManager] Could not load roster from OCI, falling back to authoritative roster:', err?.message || err);
    }
  }
  const local = readLocalJson<Student[]>('roster.json', [...AUTHORITATIVE_ROSTER]);
  return { data: local, etag: 'local-' + Date.now() };
}

/**
 * Saves roster to OCI and local storage
 */
export async function saveRoster(data: Student[], ifMatch?: string): Promise<string> {
  writeLocalJson('roster.json', data);
  if (isOciOperational()) {
    try {
      const { etag } = await putJsonToOci(PATHS.ROSTER, data, ifMatch);
      return etag;
    } catch (err: any) {
      console.warn('[StateManager] Failed to save roster to OCI, saved to local disk:', err.message);
    }
  }
  return 'local-' + Date.now();
}

/**
 * Loads pending operations from OCI or local storage
 */
export async function loadPendingOperations(): Promise<{ data: StorageOperation[]; etag: string }> {
  if (isOciOperational()) {
    try {
      const result = await getJsonFromOci<StorageOperation[]>(PATHS.OPS);
      if (result) {
        writeLocalJson('pendingOperations.json', result.data);
        return result;
      }
    } catch (err: any) {
      console.warn('[StateManager] Could not load pending operations from OCI:', err?.message || err);
    }
  }
  const local = readLocalJson<StorageOperation[]>('pendingOperations.json', []);
  return { data: local, etag: 'local-' + Date.now() };
}

/**
 * Saves pending operations to OCI and local storage
 */
export async function savePendingOperations(data: StorageOperation[], ifMatch?: string): Promise<string> {
  writeLocalJson('pendingOperations.json', data);
  if (isOciOperational()) {
    try {
      const { etag } = await putJsonToOci(PATHS.OPS, data, ifMatch);
      return etag;
    } catch (err: any) {
      console.warn('[StateManager] Failed to save pending operations to OCI, saved to local disk:', err.message);
    }
  }
  return 'local-' + Date.now();
}

/**
 * atomicUpdate abstraction for application state
 * Supports OCI with If-Match ETag when configured, and atomic local file updates when unconfigured or on failure.
 */
export async function atomicUpdate<T>(
  pathKey: string,
  transform: (current: T) => T | Promise<T>,
  maxRetries = 3
): Promise<{ data: T; etag: string }> {
  const filename = pathKey === PATHS.ROSTER 
    ? 'roster.json' 
    : (pathKey === PATHS.MEMORIES ? 'memories.json' : 'pendingOperations.json');
  const defaultData = pathKey === PATHS.ROSTER 
    ? ([...AUTHORITATIVE_ROSTER] as any as T) 
    : ([] as any as T);

  if (!isOciOperational()) {
    const currentData = readLocalJson<T>(filename, defaultData);
    const newData = await transform(currentData);
    writeLocalJson(filename, newData);
    return { data: newData, etag: 'local-' + Date.now() };
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    let result: { data: T; etag: string } | null = null;
    try {
      result = await getJsonFromOci<T>(pathKey);
    } catch {
      result = null;
    }
    const currentData = result?.data || readLocalJson<T>(filename, defaultData);
    const currentEtag = result?.etag;
    
    const newData = await transform(currentData);
    
    try {
      const { etag } = await putJsonToOci(pathKey, newData, currentEtag);
      writeLocalJson(filename, newData);
      return { data: newData, etag };
    } catch (err: any) {
      if (err.message && err.message.includes('Concurrency conflict') && attempt < maxRetries - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 * attempt));
        continue;
      }
      console.warn(`[StateManager] Failed to save ${pathKey} to OCI, falling back to local file:`, err.message);
      writeLocalJson(filename, newData);
      return { data: newData, etag: 'local-' + Date.now() };
    }
  }

  const currentData = readLocalJson<T>(filename, defaultData);
  const newData = await transform(currentData);
  writeLocalJson(filename, newData);
  return { data: newData, etag: 'local-' + Date.now() };
}

/**
 * Specialized atomic updates
 */
export async function updateMemoriesAtomic(transform: (current: ServerMemory[]) => ServerMemory[] | Promise<ServerMemory[]>) {
  return atomicUpdate<ServerMemory[]>(PATHS.MEMORIES, transform);
}

export async function updateRosterAtomic(transform: (current: Student[]) => Student[] | Promise<Student[]>) {
  return atomicUpdate<Student[]>(PATHS.ROSTER, transform);
}

export async function updateOpsAtomic(transform: (current: StorageOperation[]) => StorageOperation[] | Promise<StorageOperation[]>) {
  return atomicUpdate<StorageOperation[]>(PATHS.OPS, transform);
}
