<h1 align="center">✅ TestTrack</h1>
<p align="center"><b>A test management dashboard: organise test cases, record test runs and see pass/fail trends.</b></p>

<p align="center">
  <a href="https://github.com/zobaydadev/TestTrack-QA-Dashboard/actions"><img src="https://github.com/zobaydadev/TestTrack-QA-Dashboard/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
</p>

---

## 📌 Overview

TestTrack is a full-stack web application for QA teams. A tester creates a **project**, writes **test cases**, records a **test run** (pass, fail or blocked for each case), and the **dashboard** turns the results into a pass rate and a per-run trend.

| | |
|---|---|
| **Front end** | React + TypeScript single-page app with a landing page, sign-in, project and test case management, run recording and charts |
| **Back end** | Express REST API in TypeScript with JWT authentication and input validation |
| **Database** | PostgreSQL with a relational schema, foreign keys and constraints |
| **Quality** | 18 automated API tests against a real database, type checking and builds in CI |
| **Delivery** | Docker, docker-compose and GitHub Actions |

> **Status:** back end, front end and browser tests are built and verified in CI. The screenshots below show the running app. There is no hosted demo; run it locally with the steps further down.

---

## ✨ Features

- 🔐 **Accounts and sign-in** with hashed passwords and token-based sessions
- 📁 **Projects** that belong to their owner, with admin visibility across projects
- 📝 **Test cases** with title, steps, expected result and priority
- ▶️ **Test runs** recorded in one step, saved together or not at all
- 📊 **Dashboard** with overall pass rate, a results chart and results per run
- 📖 **API documentation** generated from an OpenAPI 3 file, served at `/docs`
- 🛡️ **Validation and error handling** that return clear messages instead of server errors

---

## 🖼️ Screenshots

Taken from the running app by a Playwright script in GitHub Actions, using sample data.

<p align="center">
  <img src="docs/screenshots/01-landing.png" alt="Landing page" width="85%" />
</p>

<table>
  <tr>
    <td width="50%"><b>Dashboard</b><br/><img src="docs/screenshots/07-dashboard.png" alt="Dashboard with pass rate and charts" /></td>
    <td width="50%"><b>Test cases</b><br/><img src="docs/screenshots/04-test-cases.png" alt="Test case list and form" /></td>
  </tr>
  <tr>
    <td width="50%"><b>Record a run</b><br/><img src="docs/screenshots/05-record-run.png" alt="Recording a test run" /></td>
    <td width="50%"><b>Run history</b><br/><img src="docs/screenshots/06-history.png" alt="Run history table" /></td>
  </tr>
  <tr>
    <td width="50%"><b>Projects</b><br/><img src="docs/screenshots/03-projects.png" alt="Projects list" /></td>
    <td width="50%"><b>API documentation (OpenAPI)</b><br/><img src="docs/screenshots/08-api-docs.png" alt="Swagger UI for the REST API" /></td>
  </tr>
</table>

---

## 🧱 Architecture

```mermaid
flowchart LR
    Browser["React + TypeScript<br/>single-page app"] -->|HTTPS, JSON| API["Express REST API"]
    API --> Auth["JWT authentication"]
    API --> Val["Input validation (zod)"]
    API -->|SQL| DB[("PostgreSQL")]
    API --> Docs["OpenAPI docs at /docs"]
```

| Layer | Choice | Why |
|---|---|---|
| Front end | React, TypeScript, React Router, Recharts | Typed components, client-side routing, ready-made charts |
| API | Node.js, Express, TypeScript | Same language across the stack, simple and well known |
| Database | PostgreSQL | Strong relational model and constraints for linked data |
| Auth | bcrypt + JWT | Stateless sessions that fit a single-page app |
| Validation | zod | One schema per request body, enforced at the API edge |
| Tests | Vitest + Supertest | Fast tests that exercise the real HTTP layer and database |
| Delivery | Docker, GitHub Actions | Same build everywhere, checked on every change |

---

## 🗄️ Data model

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ TEST_RUNS : executes
    PROJECTS ||--o{ TEST_CASES : contains
    PROJECTS ||--o{ TEST_RUNS : has
    TEST_RUNS ||--o{ TEST_RESULTS : records
    TEST_CASES ||--o{ TEST_RESULTS : "is checked in"
```

Each result links one run to one test case and is unique per pair. Deleting a project cascades to its test cases, runs and results.

---

## 🔌 API at a glance

| Method and path | Purpose |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | Accounts and tokens |
| `GET/POST /api/projects` · `GET/DELETE /api/projects/:id` | Projects |
| `GET/POST /api/projects/:id/testcases` · `PUT/DELETE /api/testcases/:id` | Test cases |
| `GET/POST /api/projects/:id/runs` · `GET /api/runs/:id` | Test runs and their results |
| `GET /api/projects/:id/stats` | Totals, pass rate and results per run |

Run the server and open `/docs` for the full interactive reference.

---

## 🔐 Security notes

- Passwords are hashed with bcrypt and never returned by the API.
- Unknown email and wrong password give the same `401` message, so the API does not reveal which accounts exist.
- Every project route checks ownership: `404` if missing, `403` if it belongs to someone else.
- Request bodies are validated with zod and limited in size; security headers come from Helmet.
- The server refuses to start in production without a real `JWT_SECRET`.

---

## 🧠 Design decisions

- **One place for access control.** All project routes go through a single `loadProject` check.
- **Runs are saved in a transaction.** A run and all its results are stored together or not at all. The API also rejects duplicate cases and cases from another project.
- **Validation at the edge.** Bad input gets a `400` with field-level details, never a database error.
- **Idempotent schema.** Tables are created on start if missing. This is enough at this size; a migration tool would replace it as the schema grows.
- **Tests hit a real database.** CI runs PostgreSQL as a service container, so queries and constraints are really exercised.

---

## 🗂️ Project structure

```text
TestTrack-QA-Dashboard
├── client/                 React + TypeScript front end (Vite)
│   └── src/
│       ├── pages/          Landing, AuthPage, Projects, ProjectDetail
│       ├── api.ts          typed API client
│       └── auth.tsx        authentication context
├── server/                 Express REST API
│   ├── src/
│   │   ├── routes/         auth.ts, resources.ts
│   │   ├── app.ts          middleware, docs, error handling
│   │   ├── migrate.ts      database schema
│   │   └── auth.ts         JWT helpers
│   ├── tests/              API tests (Vitest + Supertest)
│   └── openapi.json        API specification
├── docker-compose.yml      API + PostgreSQL
└── .github/workflows/      CI pipeline
```

---

## ▶️ Run it locally

**With Docker** (API and database):
```bash
docker compose up --build
# API:  http://localhost:3000
# Docs: http://localhost:3000/docs
```

**Without Docker** (needs PostgreSQL running):
```bash
# terminal 1: API
cd server
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/testtrack
npm run dev

# terminal 2: front end
cd client
npm install
npm run dev
# http://localhost:5173 (API calls are proxied to port 3000)
```

Run the API tests: `cd server && npm test`

---

## ✅ Quality checks (CI)

Every push runs:
1. **Server:** type check, 18 API tests against a PostgreSQL service container, production build
2. **Client:** type check and production build
3. **Browser tests:** 7 Playwright tests drive the built front end, the API and PostgreSQL together (landing page, sign-up, wrong login, protected pages, log out, the full test management flow, privacy between users)
4. **Docker:** the server image builds

The screenshots above are refreshed by a separate manual workflow (`Screenshots`) that runs the same stack and saves the images to `docs/screenshots`.

---

## 🗺️ Roadmap

- [x] REST API with authentication, projects, test cases, runs and statistics
- [x] OpenAPI documentation
- [x] React + TypeScript front end with landing page and dashboard charts
- [x] CI with a real PostgreSQL service
- [x] Browser tests with Playwright
- [x] Screenshots generated from the running app
- [ ] Hosted demo (optional; the app runs locally with Docker and npm)
- [ ] Roles: admin and tester permissions in the UI
