import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { migrate } from '../src/migrate';

const app = createApp();
const password = 'password123';

async function register(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await migrate();
  await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('health and docs', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('authentication', () => {
  it('registers, rejects duplicates and logs in', async () => {
    await register('alice@example.com');

    const dup = await request(app).post('/api/auth/register').send({ email: 'ALICE@example.com', password });
    expect(dup.status).toBe(409);

    const login = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.user.role).toBe('tester');
  });

  it('rejects a wrong password with the same message as an unknown email', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong-password' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
  });

  it('protects routes without a token or with a bad token', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
    expect((await request(app).get('/api/projects').set(auth('garbage'))).status).toBe(401);
  });
});

describe('projects, test cases, runs and statistics', () => {
  let token: string;
  let projectId: number;
  const caseIds: number[] = [];

  beforeAll(async () => {
    token = (await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password })).body.token;
  });

  it('creates and lists a project', async () => {
    const created = await request(app).post('/api/projects').set(auth(token)).send({ name: 'Checkout', description: 'Web shop' });
    expect(created.status).toBe(201);
    projectId = created.body.id;

    const list = await request(app).get('/api/projects').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].test_case_count).toBe(0);
  });

  it('rejects an invalid project', async () => {
    const res = await request(app).post('/api/projects').set(auth(token)).send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('creates test cases with a default priority', async () => {
    for (const title of ['Login works', 'Cart total is correct', 'Payment fails gracefully']) {
      const res = await request(app).post(`/api/projects/${projectId}/testcases`).set(auth(token)).send({ title });
      expect(res.status).toBe(201);
      expect(res.body.priority).toBe('medium');
      caseIds.push(res.body.id);
    }
    const list = await request(app).get(`/api/projects/${projectId}/testcases`).set(auth(token));
    expect(list.body).toHaveLength(3);
  });

  it('updates and deletes a test case', async () => {
    const updated = await request(app)
      .put(`/api/testcases/${caseIds[2]}`)
      .set(auth(token))
      .send({ title: 'Payment failure shows an error', priority: 'high' });
    expect(updated.status).toBe(200);
    expect(updated.body.priority).toBe('high');

    const extra = await request(app).post(`/api/projects/${projectId}/testcases`).set(auth(token)).send({ title: 'Temporary' });
    const del = await request(app).delete(`/api/testcases/${extra.body.id}`).set(auth(token));
    expect(del.status).toBe(204);
  });

  it('records a run and returns it with results', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/runs`)
      .set(auth(token))
      .send({
        name: 'Release 1.0 regression',
        results: [
          { testCaseId: caseIds[0], status: 'pass' },
          { testCaseId: caseIds[1], status: 'pass' },
          { testCaseId: caseIds[2], status: 'fail', notes: 'Error message missing' },
        ],
      });
    expect(res.status).toBe(201);

    const detail = await request(app).get(`/api/runs/${res.body.id}`).set(auth(token));
    expect(detail.status).toBe(200);
    expect(detail.body.results).toHaveLength(3);
    expect(detail.body.results.find((r: { status: string }) => r.status === 'fail').notes).toBe('Error message missing');
  });

  it('rejects duplicate cases and cases from another project in a run', async () => {
    const dup = await request(app)
      .post(`/api/projects/${projectId}/runs`)
      .set(auth(token))
      .send({
        name: 'Bad run',
        results: [
          { testCaseId: caseIds[0], status: 'pass' },
          { testCaseId: caseIds[0], status: 'fail' },
        ],
      });
    expect(dup.status).toBe(400);

    const other = await request(app)
      .post(`/api/projects/${projectId}/runs`)
      .set(auth(token))
      .send({ name: 'Bad run', results: [{ testCaseId: 999999, status: 'pass' }] });
    expect(other.status).toBe(400);
  });

  it('computes dashboard statistics', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/stats`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.testCases).toBe(3);
    expect(res.body.runs).toBe(1);
    expect(res.body.results).toEqual({ pass: 2, fail: 1, blocked: 0 });
    expect(res.body.passRate).toBe(66.7);
    expect(res.body.byRun).toHaveLength(1);
  });

  it('lists runs with counts', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/runs`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ pass: 2, fail: 1, blocked: 0 });
  });

  it('keeps projects private between users', async () => {
    const bob = await register('bob@example.com');
    expect((await request(app).get(`/api/projects/${projectId}`).set(auth(bob))).status).toBe(403);
    expect((await request(app).get(`/api/projects/${projectId}/stats`).set(auth(bob))).status).toBe(403);
    expect((await request(app).delete(`/api/projects/${projectId}`).set(auth(bob))).status).toBe(403);

    const list = await request(app).get('/api/projects').set(auth(bob));
    expect(list.body).toHaveLength(0);
  });

  it('returns 404 for missing and 400 for malformed ids', async () => {
    expect((await request(app).get('/api/projects/999999').set(auth(token))).status).toBe(404);
    expect((await request(app).get('/api/projects/abc').set(auth(token))).status).toBe(400);
  });

  it('deletes a project with its test cases', async () => {
    const del = await request(app).delete(`/api/projects/${projectId}`).set(auth(token));
    expect(del.status).toBe(204);
    const left = await pool.query('SELECT count(*)::int AS n FROM test_cases WHERE project_id = $1', [projectId]);
    expect(left.rows[0].n).toBe(0);
  });
});
