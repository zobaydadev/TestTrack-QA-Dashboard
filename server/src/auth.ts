import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'tester';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email, role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    req.user = {
      id: Number(payload.sub),
      email: String(payload.email),
      role: payload.role === 'admin' ? 'admin' : 'tester',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
