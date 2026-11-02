# EvalQueue

Automated essay evaluation system with Role-Based Access Control.

- **Backend**: Node.js + Express + SQLite (better-sqlite3) + JWT
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Lucide icons
- **Deployment**: Docker Compose (backend + frontend containers)

## Run with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api

The SQLite database is persisted to `./data/evalqueue.db` on the host.

### Configuration

Copy `.env.example` to `.env` (next to `docker-compose.yml`) before starting. All values are optional for a local demo.

| Variable | Purpose | If unset |
|---|---|---|
| `JWT_SECRET` | Signs login tokens | A random per-process secret is generated; logins end on restart |
| `INSTRUCTOR_INVITE_CODE` | Code required to register an *Instructor* account | Instructor self-registration is disabled (students only) |
| `CORS_ORIGIN` | Comma-separated allowed origins (only needed without the nginx proxy) | CORS disabled (same-origin) |
| `AUTH_RATE_LIMIT_MAX` | Max login/register requests per IP per 15 min | 30 |

## Seed credentials

The database initializes with realistic test data on first boot.

| Role       | Name                | Email                        | Password    |
|------------|---------------------|------------------------------|-------------|
| Instructor | Dr. Elena Marsh     | elena.marsh@evalqueue.edu    | Passw0rd!   |
| Student    | Priya Ramanathan    | priya@evalqueue.edu          | Passw0rd!   |
| Student    | Marcus Okafor       | marcus@evalqueue.edu         | Passw0rd!   |

Pre-seeded content: 2 assignments and 3 submissions. On start-up the recovery sweep evaluates any submission still `Pending`, so the seeded pending submission becomes `Evaluated` immediately.

## Local development (without Docker)

```bash
# Terminal 1
cd backend
npm install
JWT_SECRET=dev-secret INSTRUCTOR_INVITE_CODE=letmein npm start

# Terminal 2
cd frontend
npm install
npm run dev
```

Vite dev server runs on http://localhost:5173 and proxies `/api` to the backend on `:4000`.

## Architecture

```
frontend (nginx :80)  ──/api/*──▶  backend (express :4000)  ──▶  SQLite (/app/data/evalqueue.db)
```

- JWT stored in `localStorage`, attached as `Authorization: Bearer <token>`.
- Evaluation engine (`backend/src/evaluator.js`) runs asynchronously via `setImmediate` after each `POST /api/submissions`, computing a `similarity_score` from required-keyword hits and flipping status `Pending → Evaluated`.
- Instructors override the auto score with a `final_grade` and `instructor_feedback`, which flips status to `Graded`.

## Tests

```bash
cd backend
npm test        # 21 automated API tests (Node built-in test runner)
```

Covered: authentication, RBAC, privilege-escalation guard, ownership checks, validation, asynchronous evaluation, whole-term keyword scoring, start-up recovery sweep, rate limiting. A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the backend tests and the frontend build on every push.

## Security notes

- Instructor accounts cannot be self-created without the server-side invite code.
- Instructors see and grade only submissions for their own assignments; students see only their own.
- Login and registration are rate limited. Passwords are stored as bcrypt hashes.
- Known limitations: JWT is kept in `localStorage`, no TLS inside the Compose setup (terminate TLS at the cloud proxy), no e-mail password reset.
