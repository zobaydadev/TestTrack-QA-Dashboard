const DEFAULT_SECRET = 'dev-secret-change-me';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/testtrack',
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_SECRET,
  jwtExpiresIn: '8h',
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === DEFAULT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
