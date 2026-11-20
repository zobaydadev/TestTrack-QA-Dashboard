import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { AuthUser, requireAuth, signToken } from '../auth';
import { query } from '../db';
import { ah, HttpError, parse } from '../http';

export const authRouter = Router();

const credentials = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(72),
});

const publicUser = (u: AuthUser) => ({ id: u.id, email: u.email, role: u.role });

authRouter.post(
  '/register',
  ah(async (req, res) => {
    const { email, password } = parse(credentials, req.body);
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'Email already registered');
    }
    const hash = await bcrypt.hash(password, 10);
    const created = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
      [email, hash],
    );
    const user = created.rows[0] as AuthUser;
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

authRouter.post(
  '/login',
  ah(async (req, res) => {
    const { email, password } = parse(credentials, req.body);
    const found = await query('SELECT id, email, role, password_hash FROM users WHERE email = $1', [email]);
    const row = found.rows[0];
    // Same message for unknown email and wrong password, so the API does not reveal which accounts exist
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new HttpError(401, 'Invalid credentials');
    }
    const user: AuthUser = { id: row.id, email: row.email, role: row.role };
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
