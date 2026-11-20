import { Request, Router } from 'express';
import { z } from 'zod';
import { AuthUser, requireAuth } from '../auth';
import { pool, query } from '../db';
import { ah, HttpError, idParam, parse } from '../http';

export const resources = Router();
resources.use(requireAuth);

const currentUser = (req: Request) => req.user as AuthUser;

const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

const caseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  steps: z.string().max(5000).optional(),
  expected: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const runSchema = z.object({
  name: z.string().trim().min(1).max(100),
  results: z
    .array(
      z.object({
        testCaseId: z.number().int().positive(),
        status: z.enum(['pass', 'fail', 'blocked']),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1),
});

/** A project is visible to its owner and to admins. */
async function loadProject(id: number, user: AuthUser) {
  const result = await query('SELECT * FROM projects WHERE id = $1', [id]);
  const project = result.rows[0];
  if (!project) throw new HttpError(404, 'Project not found');
  if (user.role !== 'admin' && project.owner_id !== user.id) throw new HttpError(403, 'Forbidden');
  return project;
}

async function loadCase(id: number, user: AuthUser) {
  const result = await query('SELECT * FROM test_cases WHERE id = $1', [id]);
  const testCase = result.rows[0];
  if (!testCase) throw new HttpError(404, 'Test case not found');
  await loadProject(testCase.project_id, user);
  return testCase;
}

// ---------- Projects ----------

resources.get(
  '/projects',
  ah(async (req, res) => {
    const user = currentUser(req);
    const result = await query(
      `SELECT p.*, (SELECT count(*) FROM test_cases t WHERE t.project_id = p.id)::int AS test_case_count
         FROM projects p
        WHERE $1::boolean OR p.owner_id = $2
        ORDER BY p.id`,
      [user.role === 'admin', user.id],
    );
    res.json(result.rows);
  }),
);

resources.post(
  '/projects',
  ah(async (req, res) => {
    const user = currentUser(req);
    const body = parse(projectSchema, req.body);
    const result = await query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [body.name, body.description ?? null, user.id],
    );
    res.status(201).json(result.rows[0]);
  }),
);

resources.get(
  '/projects/:id',
  ah(async (req, res) => {
    res.json(await loadProject(idParam(req), currentUser(req)));
  }),
);

resources.delete(
  '/projects/:id',
  ah(async (req, res) => {
    const project = await loadProject(idParam(req), currentUser(req));
    await query('DELETE FROM projects WHERE id = $1', [project.id]);
    res.status(204).end();
  }),
);

// ---------- Test cases ----------

resources.get(
  '/projects/:id/testcases',
  ah(async (req, res) => {
    const project = await loadProject(idParam(req), currentUser(req));
    const result = await query('SELECT * FROM test_cases WHERE project_id = $1 ORDER BY id', [project.id]);
    res.json(result.rows);
  }),
);

resources.post(
  '/projects/:id/testcases',
  ah(async (req, res) => {
    const project = await loadProject(idParam(req), currentUser(req));
    const body = parse(caseSchema, req.body);
    const result = await query(
      `INSERT INTO test_cases (project_id, title, steps, expected, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project.id, body.title, body.steps ?? null, body.expected ?? null, body.priority],
    );
    res.status(201).json(result.rows[0]);
  }),
);

resources.put(
  '/testcases/:id',
  ah(async (req, res) => {
    const existing = await loadCase(idParam(req), currentUser(req));
    const body = parse(caseSchema, req.body);
    const result = await query(
      `UPDATE test_cases SET title = $1, steps = $2, expected = $3, priority = $4
        WHERE id = $5 RETURNING *`,
      [body.title, body.steps ?? null, body.expected ?? null, body.priority, existing.id],
    );
    res.json(result.rows[0]);
  }),
);

resources.delete(
  '/testcases/:id',
  ah(async (req, res) => {
    const existing = await loadCase(idParam(req), currentUser(req));
    await query('DELETE FROM test_cases WHERE id = $1', [existing.id]);
    res.status(204).end();
  }),
);

// ---------- Test runs ----------

resources.post(
  '/projects/:id/runs',
  ah(async (req, res) => {
    const user = currentUser(req);
    const project = await loadProject(idParam(req), user);
    const body = parse(runSchema, req.body);

    const ids = body.results.map((r) => r.testCaseId);
    if (new Set(ids).size !== ids.length) {
      throw new HttpError(400, 'A test case can appear only once per run');
    }
    const found = await query('SELECT id FROM test_cases WHERE project_id = $1 AND id = ANY($2::int[])', [
      project.id,
      ids,
    ]);
    if (found.rows.length !== ids.length) {
      throw new HttpError(400, 'Some test cases do not belong to this project');
    }

    // The run and its results are saved together or not at all
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const run = await client.query(
        'INSERT INTO test_runs (project_id, name, executed_by) VALUES ($1, $2, $3) RETURNING *',
        [project.id, body.name, user.id],
      );
      for (const r of body.results) {
        await client.query(
          'INSERT INTO test_results (run_id, test_case_id, status, notes) VALUES ($1, $2, $3, $4)',
          [run.rows[0].id, r.testCaseId, r.status, r.notes ?? null],
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ ...run.rows[0], results: body.results });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

const countsSql = `
  count(*) FILTER (WHERE r.status = 'pass')::int    AS pass,
  count(*) FILTER (WHERE r.status = 'fail')::int    AS fail,
  count(*) FILTER (WHERE r.status = 'blocked')::int AS blocked`;

resources.get(
  '/projects/:id/runs',
  ah(async (req, res) => {
    const project = await loadProject(idParam(req), currentUser(req));
    const result = await query(
      `SELECT u.id, u.name, u.created_at, ${countsSql}
         FROM test_runs u
         LEFT JOIN test_results r ON r.run_id = u.id
        WHERE u.project_id = $1
        GROUP BY u.id
        ORDER BY u.id`,
      [project.id],
    );
    res.json(result.rows);
  }),
);

resources.get(
  '/runs/:id',
  ah(async (req, res) => {
    const user = currentUser(req);
    const runResult = await query('SELECT * FROM test_runs WHERE id = $1', [idParam(req)]);
    const run = runResult.rows[0];
    if (!run) throw new HttpError(404, 'Run not found');
    await loadProject(run.project_id, user);
    const results = await query(
      `SELECT r.test_case_id, t.title, r.status, r.notes
         FROM test_results r JOIN test_cases t ON t.id = r.test_case_id
        WHERE r.run_id = $1 ORDER BY r.id`,
      [run.id],
    );
    res.json({ ...run, results: results.rows });
  }),
);

// ---------- Dashboard statistics ----------

resources.get(
  '/projects/:id/stats',
  ah(async (req, res) => {
    const project = await loadProject(idParam(req), currentUser(req));

    const cases = await query('SELECT count(*)::int AS total FROM test_cases WHERE project_id = $1', [project.id]);
    const totals = await query(
      `SELECT ${countsSql}
         FROM test_results r JOIN test_runs u ON u.id = r.run_id
        WHERE u.project_id = $1`,
      [project.id],
    );
    const byRun = await query(
      `SELECT u.id, u.name, u.created_at, ${countsSql}
         FROM test_runs u LEFT JOIN test_results r ON r.run_id = u.id
        WHERE u.project_id = $1
        GROUP BY u.id ORDER BY u.id`,
      [project.id],
    );

    const { pass, fail, blocked } = totals.rows[0];
    const executed = pass + fail + blocked;
    res.json({
      testCases: cases.rows[0].total,
      runs: byRun.rows.length,
      results: { pass, fail, blocked },
      passRate: executed > 0 ? Math.round((pass / executed) * 1000) / 10 : 0,
      byRun: byRun.rows,
    });
  }),
);
