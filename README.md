# TestTrack

A test management dashboard: teams keep projects and test cases, record test runs, and see pass/fail trends.

**Status:** the REST API (authentication, projects, test cases, runs, statistics) is built and tested against PostgreSQL in CI. The React front end is next.

## Architecture

```mermaid
flowchart LR
    Browser["React front end (next)"] -->|HTTPS, JSON| API["Express REST API"]
    API --> Auth["JWT authentication"]
    API --> Val["Input validation (zod)"]
    API -->|SQL| DB[("PostgreSQL")]
    API --> Docs["OpenAPI docs at /docs"]
```

| Layer | Choice |
|---|---|
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL (relational schema with foreign keys and constraints) |
| Auth | bcrypt password hashing, JWT bearer tokens |
| Validation | zod schemas at the API boundary |
| Docs | OpenAPI 3 served with Swagger UI |
| Tests | Vitest and Supertest against a real database |
| Delivery | Docker, docker-compose, GitHub Actions |

## Data model

`users` 1-n `projects` 1-n `test_cases`, and `projects` 1-n `test_runs` 1-n `test_results` (each result links one run to one test case; unique per pair). Deleting a project cascades to everything inside it.

## API overview

| Method and path | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Accounts and JWT |
| `GET/POST /api/projects`, `GET/DELETE /api/projects/:id` | Projects |
| `GET/POST /api/projects/:id/testcases`, `PUT/DELETE /api/testcases/:id` | Test cases |
| `GET/POST /api/projects/:id/runs`, `GET /api/runs/:id` | Test runs and their results |
| `GET /api/projects/:id/stats` | Dashboard numbers: totals, pass rate, results per run |

Full reference: run the server and open `/docs`.

## Design decisions

- **Ownership checks in one place.** Every project route goes through `loadProject`, which returns 404 for missing and 403 for someone else's project; admins can see all.
- **Runs are saved in a transaction.** A run and all its results are stored together or not at all. The API also rejects duplicate cases in a run and cases from another project.
- **Login errors don't reveal accounts.** Unknown email and wrong password return the same 401 message.
- **Idempotent schema.** The server creates tables on start if missing. Fine for this size; a migration tool would replace it as the schema grows.
- **Validation at the edge.** Bad input gets a 400 with field-level details, never a database error.

## Run it

With Docker:
```bash
docker compose up --build
# API on http://localhost:3000, docs on http://localhost:3000/docs
```

Without Docker (needs PostgreSQL running):
```bash
cd server
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/testtrack
npm run dev
npm test
```

## Roadmap
- React and TypeScript front end with login, test case management and a results chart
- Browser tests with Playwright
- Deployed demo
