import * as jose from 'jose';

// Secret for signing session tokens - must be configured in Vercel environment
const SESSION_SECRET = process.env.SESSION_SECRET || 'kmc26_default_secret_change_me_in_prod';
const secretKey = new TextEncoder().encode(SESSION_SECRET);

export interface MemorySessionPayload {
  memoryId: string;
  iat: number;
  exp: number;
}

/**
 * Signs a stateless edit session token for a specific memory
 */
export async function signMemoryToken(memoryId: string): Promise<string> {
  const jwt = await new jose.SignJWT({ memoryId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);
  return jwt;
}

/**
 * Verifies a memory edit token
 */
export async function verifyMemoryToken(token: string, expectedMemoryId: string): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return (payload as any).memoryId === expectedMemoryId;
  } catch {
    return false;
  }
}

/**
 * Signs a batch session token with Remember Me support
 */
export async function signBatchSessionToken(rememberMe: boolean): Promise<string> {
  const expiration = rememberMe ? '30d' : '4h';
  const jwt = await new jose.SignJWT({ role: 'batch_member', rememberMe })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(secretKey);
  return jwt;
}

/**
 * Verifies a batch session token
 */
export async function verifyBatchSessionToken(token: string): Promise<boolean> {
  if (!token) return false;
  // Backward compatibility with previous session tokens
  if (token.startsWith('kmc26-session-')) {
    return true;
  }
  try {
    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return (payload as any).role === 'batch_member';
  } catch {
    return false;
  }
}
