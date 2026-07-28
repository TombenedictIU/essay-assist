# EvalQueue — Standalone Node/Express + SQLite + Docker

Runtime confirmed: standalone backend, no Lovable Cloud, no Postgres, no DB triggers, JWT auth, Docker-based deployment. The Lovable preview will NOT run this app; you'll build/run it locally with `docker compose up`. All files land in this repo so you can download the codebase.

## Repository layout

```text
/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   └── src/
│       ├── server.js               # Express bootstrap, CORS, routes mount
│       ├── db.js                   # better-sqlite3 connection + schema init + seed
│       ├── auth.js                 # JWT sign/verify, bcrypt, requireAuth, requireRole
│       ├── evaluator.js            # async keyword-scoring service
│       ├── routes/
│       │   ├── auth.routes.js      # POST /register, POST /login
│       │   ├── assignments.routes.js
│       │   └── submissions.routes.js
│       └── seed.js                 # idempotent seed (users, assignments, submissions)
├── frontend/
│   ├── Dockerfile                  # multi-stage: build with Node, serve with nginx
│   ├── nginx.conf                  # SPA fallback + /api proxy to backend
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx, App.tsx, router.tsx
│       ├── styles.css              # Tailwind, blue-accent academic tokens
│       ├── lib/api.ts              # fetch wrapper, attaches JWT from localStorage
│       ├── lib/auth.tsx            # AuthContext, useAuth, ProtectedRoute
│       ├── components/             # AppShell, Sidebar, Table, Card, Button, Badge, Textarea, FormField
│       └── pages/
│           ├── Login.tsx, Register.tsx
│           ├── instructor/Dashboard.tsx, NewAssignment.tsx, Submissions.tsx, GradeSubmission.tsx
│           └── student/Dashboard.tsx, SubmitAssignment.tsx, MySubmission.tsx
└── data/                           # host-mounted SQLite volume (created at runtime)
```

The existing TanStack Start scaffold at repo root (`src/routes/*`, `src/router.tsx`, `vite.config.ts`, `package.json`, etc.) is unrelated to this deliverable and stays untouched.

## Backend

- **Express 4**, `cors`, `helmet`, `morgan`, `express.json`
- **better-sqlite3** — synchronous, zero-config, file at `/app/data/evalqueue.db` inside container, host-mounted via `./data:/app/data`
- **JWT auth**: `jsonwebtoken` + `bcryptjs`; `JWT_SECRET` from env; `Authorization: Bearer <token>`; middleware `requireAuth` and `requireRole('Instructor' | 'Student')`
- **Schema** (created on boot if missing):
  - `users(id INTEGER PK, name, email UNIQUE, password_hash, role CHECK IN ('Student','Instructor'))`
  - `assignments(id, instructor_id FK, title, description, required_keywords TEXT)` — comma-separated per spec
  - `submissions(id, assignment_id FK, student_id FK, content, status CHECK IN ('Pending','Evaluated','Graded'), similarity_score INT, final_grade INT, instructor_feedback TEXT, created_at)`
- **Evaluator (`evaluator.js`)** — plain JS, no triggers:
  ```js
  export function scheduleEvaluation(submissionId) {
    setImmediate(() => evaluateNow(submissionId));   // async, non-blocking
  }
  function evaluateNow(id) {
    const sub = db.prepare('SELECT s.content, a.required_keywords FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE s.id=?').get(id);
    const keywords = sub.required_keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const text = sub.content.toLowerCase();
    const hits = keywords.filter(k => text.includes(k)).length;
    const score = keywords.length ? Math.round((hits / keywords.length) * 100) : 0;
    db.prepare("UPDATE submissions SET similarity_score=?, status='Evaluated' WHERE id=? AND status='Pending'").run(score, id);
  }
  ```
  `POST /submissions` inserts with `status='Pending'`, returns 201 immediately, then `scheduleEvaluation(id)` runs on the next tick.

### REST API

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | `{name,email,password,role}` → `{token,user}` |
| POST | `/api/auth/login` | public | `{email,password}` → `{token,user}` |
| GET  | `/api/me` | any auth | current user |
| GET  | `/api/assignments` | any auth | list all |
| POST | `/api/assignments` | Instructor | create |
| GET  | `/api/assignments/:id` | any auth | detail |
| GET  | `/api/submissions` | Instructor: all · Student: own | list |
| GET  | `/api/submissions/:id` | owner student or any instructor | detail |
| POST | `/api/submissions` | Student | `{assignment_id,content}` → queues evaluation |
| PATCH | `/api/submissions/:id/grade` | Instructor | `{final_grade,instructor_feedback}` → status `Graded` |

### Seed data (`seed.js`, runs once if `users` table empty)

- Instructor: **Dr. Elena Marsh** — `elena.marsh@evalqueue.edu` / `Passw0rd!`
- Students: **Priya Ramanathan** (`priya@evalqueue.edu`), **Marcus Okafor** (`marcus@evalqueue.edu`) — both `Passw0rd!`
- Assignments:
  1. *The Ethics of Algorithmic Decision-Making* — keywords: `accountability, bias, transparency, fairness, oversight`
  2. *Climate Adaptation in Coastal Cities* — keywords: `resilience, infrastructure, mitigation, sea-level, policy`
- Submissions (realistic paragraphs, no lorem):
  - Priya → assignment 1 → `Graded`, similarity_score 80, final_grade 88, feedback praising treatment of transparency & oversight
  - Marcus → assignment 1 → `Evaluated`, similarity_score 60, no grade yet
  - Priya → assignment 2 → `Pending`, no score (demonstrates queue state)

## Frontend (React + Vite + Tailwind + Lucide)

- Vite 5 + React 18 + TypeScript, Tailwind v3 (standard config — this is a plain Vite app, not Lovable's TW v4 pipeline)
- Lucide icons (`GraduationCap`, `FileText`, `CheckCircle2`, `Clock`, `LogOut`, `Plus`, etc.)
- **Design tokens** — clean academic look: `--background: #f8fafc` (slate-50), cards `#ffffff`, borders `#e2e8f0`, primary `#1d4ed8` (blue-700), primary-hover `#1e40af`, text `#0f172a`, muted `#64748b`. Legible tables with row hover, sticky headers.
- **Routing** with `react-router-dom` v6:
  - `/login`, `/register`
  - `/instructor` (dashboard), `/instructor/assignments/new`, `/instructor/submissions/:id`
  - `/student` (dashboard), `/student/assignments/:id/submit`, `/student/submissions/:id`
  - `ProtectedRoute` reads JWT+role from `AuthContext`; role mismatch → redirect to correct dashboard; unauth → `/login`
- **Auth**: JWT stored in `localStorage` under `evalqueue_token`; `api.ts` attaches `Authorization` header; 401 clears token and redirects to `/login`
- **Views**:
  - *Instructor Dashboard*: two tabs/cards — Assignments (with "New assignment" button) and Submissions (table: student, assignment, status badge, similarity, actions → Grade)
  - *New Assignment*: title, description (textarea), required keywords (comma-separated input with helper text and chip preview)
  - *Grade Submission*: renders essay content in a readable prose panel, shows auto `similarity_score` prominently, form with `final_grade` (0–100 number input, validated) and `instructor_feedback` (textarea); Save → PATCH → status becomes `Graded`
  - *Student Dashboard*: list of available assignments (submit button per assignment, disabled if already submitted) + "My Submissions" table with status + grade
  - *Submit Assignment*: large textarea (min-height ~360px, monospace-friendly serif), word counter, submit
  - *My Submission*: status badge (Pending/Evaluated/Graded), similarity score, final grade + feedback when graded; auto-refetch every 3s while `Pending` to demo the async transition
- **Status badges**: Pending = amber, Evaluated = blue, Graded = green

## Docker

**`backend/Dockerfile`** — `node:20-alpine`, install deps, copy src, `EXPOSE 4000`, `CMD ["node","src/server.js"]`. `better-sqlite3` needs build deps → install `python3 make g++` in a builder stage, copy `node_modules` to a slim runtime stage.

**`frontend/Dockerfile`** — multi-stage:
1. `node:20-alpine` → `npm ci && npm run build`
2. `nginx:alpine` → copy `dist/` to `/usr/share/nginx/html`, custom `nginx.conf` with `try_files $uri /index.html;` (SPA fallback) and `location /api/ { proxy_pass http://backend:4000/api/; }`

**`docker-compose.yml`**:
```yaml
services:
  backend:
    build: ./backend
    environment:
      JWT_SECRET: change-me-in-production
      PORT: 4000
    volumes:
      - ./data:/app/data
    ports:
      - "4000:4000"
    restart: unless-stopped
  frontend:
    build: ./frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Frontend calls `/api/*` (same-origin via nginx proxy), so no CORS needed in production. Backend also enables `cors()` for local Vite dev on `:5173`.

## README addition

Root `README-evalqueue.md` with:
- `docker compose up --build`
- URLs: frontend `http://localhost:8080`, backend `http://localhost:4000/api`
- Seed credentials table
- Dev workflow (running frontend/backend without Docker)

## Build order

1. `backend/` package.json, server, db, auth, evaluator, routes, seed → Dockerfile
2. `frontend/` scaffold (package.json, vite/tailwind config, index.html, main, router, auth context, api client)
3. Frontend pages: Login/Register → Instructor views → Student views → shared AppShell/Sidebar
4. Design tokens + polish (badges, tables, forms)
5. Root `docker-compose.yml` + frontend `Dockerfile`/`nginx.conf`
6. README with run instructions and credentials

## Verification (what I can and can't do here)

- I will run `node -c` on backend files and `tsc --noEmit` on the frontend to catch syntax/type errors.
- I cannot run `docker compose up` or hit the running app from this sandbox — you verify locally.