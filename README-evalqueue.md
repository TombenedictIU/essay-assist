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

## Seed credentials

The database initializes with realistic test data on first boot.

| Role       | Name                | Email                        | Password    |
|------------|---------------------|------------------------------|-------------|
| Instructor | Dr. Elena Marsh     | elena.marsh@evalqueue.edu    | Passw0rd!   |
| Student    | Priya Ramanathan    | priya@evalqueue.edu          | Passw0rd!   |
| Student    | Marcus Okafor       | marcus@evalqueue.edu         | Passw0rd!   |

Pre-seeded content: 2 assignments and 3 submissions across `Pending`, `Evaluated`, and `Graded` states.

## Local development (without Docker)

```bash
# Terminal 1
cd backend
npm install
JWT_SECRET=dev-secret npm start

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
