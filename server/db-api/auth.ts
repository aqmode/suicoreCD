import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const JWKS_URI = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : '';

const jwksClient = JWKS_URI ? jwksRsa({ jwksUri: JWKS_URI, cache: true, rateLimit: true }) : null;

if (!JWT_SECRET && !jwksClient) {
  throw new Error('Set SUPABASE_JWT_SECRET or SUPABASE_URL (for JWKS) in .env');
}

export interface AuthUser {
  id: string;
  email?: string;
}

function setUser(req: Request, decoded: jwt.JwtPayload): void {
  const sub = decoded.sub;
  if (!sub) throw new Error('Missing sub');
  (req as Request & { user: AuthUser }).user = { id: sub, email: decoded.email as string | undefined };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 1) Legacy JWT secret (HS256)
  if (JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      setUser(req, decoded);
      next();
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg !== 'invalid signature' && msg !== 'invalid algorithm' && !msg.includes('signature')) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }
  }

  // 2) JWKS (новые ключи Supabase: RS256 / ES256)
  if (jwksClient) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded?.header?.kid) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      const key = await jwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();
      const verified = jwt.verify(token, signingKey) as jwt.JwtPayload;
      setUser(req, verified);
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  }

  res.status(401).json({ error: 'Invalid token' });
}
