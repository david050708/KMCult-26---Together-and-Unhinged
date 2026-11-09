import type { Student, Memory, Photograph } from '../types/index.ts';

// In-memory & session storage for memory-level editing tokens
const MEMORY_TOKENS_KEY = 'kmc26_memory_tokens';

export function getMemoryToken(memoryId: string): string | null {
  try {
    const raw = sessionStorage.getItem(MEMORY_TOKENS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[memoryId] || null;
  } catch {
    return null;
  }
}

export function setMemoryToken(memoryId: string, token: string): void {
  try {
    const raw = sessionStorage.getItem(MEMORY_TOKENS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[memoryId] = token;
    sessionStorage.setItem(MEMORY_TOKENS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save memory token', e);
  }
}

export function clearMemoryToken(memoryId: string): void {
  try {
    const raw = sessionStorage.getItem(MEMORY_TOKENS_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[memoryId];
    sessionStorage.setItem(MEMORY_TOKENS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to clear memory token', e);
  }
}

export function hasMemoryToken(memoryId: string): boolean {
  return Boolean(getMemoryToken(memoryId));
}

// -------------------------------------------------------------
// Authentication Services
// -------------------------------------------------------------

export async function loginBatch(username: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Authentication failed' };
    }
    if (data.token) {
      localStorage.setItem('kmc26_token', data.token);
    }
    return { success: true, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network connection error' };
  }
}

export async function checkBatchSession(): Promise<{ authenticated: boolean; token?: string }> {
  try {
    const token = localStorage.getItem('kmc26_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/session', { headers });
    if (!res.ok) return { authenticated: false };
    const data = await res.json();
    if (data.authenticated && data.token) {
      localStorage.setItem('kmc26_token', data.token);
    }
    return data;
  } catch {
    return { authenticated: false };
  }
}

export async function logoutBatch(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  localStorage.removeItem('kmc26_token');
  sessionStorage.removeItem(MEMORY_TOKENS_KEY);
}

/**
 * Verify Memory Editing Password
 */
export async function authenticateMemoryEdit(memoryId: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`/api/memories/${memoryId}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Incorrect memory password' };
    }
    if (data.token) {
      setMemoryToken(memoryId, data.token);
    }
    return { success: true, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during authorization' };
  }
}

// -------------------------------------------------------------
// Authoritative Roster Directory Services
// -------------------------------------------------------------

export async function fetchRoster(): Promise<{ total: number; students: Student[] }> {
  const res = await fetch('/api/roster');
  if (!res.ok) throw new Error('Failed to load roster directory');
  return res.json();
}

export async function fetchRosterValidation(): Promise<{
  totalCount: number;
  isExact150: boolean;
  uniqueIdsCount: number;
  allIdsUnique: boolean;
  duplicateNames: string[];
  orderPreserved: boolean;
  indicesValid: boolean;
  status: 'valid' | 'invalid';
  messages: string[];
}> {
  const res = await fetch('/api/roster/validate');
  if (!res.ok) throw new Error('Failed to fetch roster validation');
  return res.json();
}

export async function updateAuthoritativeRoster(names: string[]): Promise<{ success: boolean; students: Student[]; error?: string }> {
  const res = await fetch('/api/roster/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names })
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, students: [], error: data.error || 'Failed to update authoritative roster' };
  }
  return { success: true, students: data.students };
}

export async function resetRosterSlots(): Promise<{ success: boolean; students: Student[] }> {
  const res = await fetch('/api/roster/reset', { method: 'POST' });
  return res.json();
}

// -------------------------------------------------------------
// Memory Chronicle Services
// -------------------------------------------------------------

export async function fetchMemories(): Promise<Memory[]> {
  const res = await fetch('/api/memories');
  if (!res.ok) throw new Error('Failed to fetch memories');
  return res.json();
}

export async function fetchMemory(id: string): Promise<Memory> {
  const res = await fetch(`/api/memories/${id}`);
  if (!res.ok) throw new Error('Memory not found');
  return res.json();
}

export async function createMemory(payload: {
  title: string;
  description: string;
  date: string;
  category?: string;
  password: string; // Required editing password
  reconstructionMode?: 'original' | 'oil_painting';
  initialPhotos?: { url: string; caption?: string; taggedStudentIds?: string[]; location?: string; date?: string }[];
}): Promise<Memory> {
  const res = await fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create memory');
  }
  // If backend issued creator token, store it
  if (data.editToken && data.memory?.id) {
    setMemoryToken(data.memory.id, data.editToken);
  }
  return data.memory || data;
}

export async function updateMemory(id: string, payload: {
  title?: string;
  description?: string;
  date?: string;
  category?: string;
  coverPhotoId?: string;
}): Promise<Memory> {
  const token = getMemoryToken(id);
  const res = await fetch(`/api/memories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-memory-token': token || ''
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update memory');
  return data;
}

export async function deleteMemory(id: string): Promise<{ success: boolean }> {
  const token = getMemoryToken(id);
  const res = await fetch(`/api/memories/${id}`, {
    method: 'DELETE',
    headers: {
      'x-memory-token': token || ''
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete memory');
  clearMemoryToken(id);
  return data;
}

export async function bulkDeleteMemories(payload: {
  memoryIds?: string[];
  olderThanDays?: number;
  customCutoffDate?: string;
}): Promise<{
  success: boolean;
  total: number;
  deleted: number;
  failed: number;
  message: string;
}> {
  const token = localStorage.getItem('kmc26_token');
  const res = await fetch('/api/memories/bulk-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-batch-token': token || ''
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Bulk deletion failed');
  return data;
}


export async function addPhotosToMemory(memoryId: string, photos: {
  url: string;
  caption?: string;
  date?: string;
  location?: string;
  taggedStudentIds?: string[];
  size?: string;
}[]): Promise<{ memory: Memory; addedPhotos: Photograph[] }> {
  const token = getMemoryToken(memoryId);
  const res = await fetch(`/api/memories/${memoryId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-memory-token': token || ''
    },
    body: JSON.stringify({ photos })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add photographs');
  return data;
}

export async function updatePhotoDetails(memoryId: string, photoId: string, payload: {
  caption?: string;
  location?: string;
  date?: string;
  taggedStudentIds?: string[];
  isCover?: boolean;
  newImageData?: string;
}): Promise<{ memory: Memory; photo: Photograph }> {
  const token = getMemoryToken(memoryId);
  const res = await fetch(`/api/memories/${memoryId}/photos/${photoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-memory-token': token || ''
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update photograph details');
  return data;
}

export async function deletePhotoFromMemory(memoryId: string, photoId: string): Promise<{ success: boolean; memory: Memory }> {
  const token = getMemoryToken(memoryId);
  const res = await fetch(`/api/memories/${memoryId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      'x-memory-token': token || ''
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to remove photograph');
  return data;
}

export async function uploadArtworkToMemory(memoryId: string, photoId: string, dataUrl: string): Promise<{ success: boolean; artworkUrl: string; photo?: Photograph }> {
  try {
    const res = await fetch(`/api/memories/${memoryId}/photos/${photoId}/artwork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl })
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('Artwork upload failed:', data.error);
      return { success: false, artworkUrl: '' };
    }
    return data;
  } catch (err: any) {
    console.warn('Artwork upload request error:', err.message);
    return { success: false, artworkUrl: '' };
  }
}

export interface StorageMetrics {
  usedBytes: number;
  allowanceBytes: number;
  remainingBytes: number;
  percentageUsed: number;
  objectCount: number;
  provider: string;
  isOciLive: boolean;
  isLimitReached: boolean;
}

export async function getStorageUsage(forceFresh: boolean = false): Promise<StorageMetrics> {
  const fallbackMetrics: StorageMetrics = {
    usedBytes: 0,
    allowanceBytes: 10737418240,
    remainingBytes: 10737418240,
    percentageUsed: 0,
    objectCount: 0,
    provider: 'Local Storage (Active)',
    isOciLive: false,
    isLimitReached: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const url = forceFresh ? '/api/storage/usage?fresh=true' : '/api/storage/usage';
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return fallbackMetrics;
    }

    const data = await res.json();
    if (!res.ok) return fallbackMetrics;
    return data;
  } catch {
    clearTimeout(timeoutId);
    return fallbackMetrics;
  }
}

export interface StorageHealthReport {
  status: 'operational' | 'unconfigured' | 'unavailable' | 'degraded';
  bucket: string;
  namespace: string;
  region: string;
  isConfigured: boolean;
  lastCheckTime: string;
  lastSuccessfulOperationTime: string | null;
  consecutiveFailures: number;
  latencyMs: number;
  details: string;
}

export async function getResetDryRun(): Promise<any> {
  const token = localStorage.getItem('kmc26_token');
  const res = await fetch('/api/storage/reset-fresh-start/dry-run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-batch-token': token || ''
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch reset dry-run inventory');
  return data;
}

export async function executeFreshStartReset(confirmationPhrase: string): Promise<any> {
  const token = localStorage.getItem('kmc26_token');
  const res = await fetch('/api/storage/reset-fresh-start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-batch-token': token || ''
    },
    body: JSON.stringify({ confirmationPhrase })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fresh-start reset failed');
  return data;
}


