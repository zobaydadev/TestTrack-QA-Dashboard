import { query } from './db';

// Idempotent schema: safe to run on every start.
const schema = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'tester' CHECK (role IN ('admin', 'tester')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_cases (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  steps      TEXT,
  expected   TEXT,
  priority   TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);

CREATE TABLE IF NOT EXISTS test_runs (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  executed_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);

CREATE TABLE IF NOT EXISTS test_results (
  id           SERIAL PRIMARY KEY,
  run_id       INTEGER NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'blocked')),
  notes        TEXT,
  UNIQUE (run_id, test_case_id)
);
`;

export async function migrate(): Promise<void> {
  await query(schema);
}
