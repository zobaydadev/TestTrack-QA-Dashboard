import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { HttpError } from './http';
import { authRouter } from './routes/auth';
import { resources } from './routes/resources';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // API documentation, generated from openapi.json in the server folder
  const specPath = path.join(process.cwd(), 'openapi.json');
  if (fs.existsSync(specPath)) {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use('/api/auth', authRouter);
  app.use('/api', resources);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler: validation, known HTTP errors, malformed JSON, then unexpected errors
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Malformed JSON body' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
