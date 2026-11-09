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
  } catch (err) {
    return false;
  }
}
