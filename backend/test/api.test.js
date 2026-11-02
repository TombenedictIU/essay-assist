// Automated API tests (Node's built-in test runner; run with `npm test`).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Environment must be set before the database module is imported.
process.env.DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "evalqueue-test-"));
process.env.JWT_SECRET = "test-secret-value";
process.env.INSTRUCTOR_INVITE_CODE = "invite-123";
process.env.NODE_ENV = "test";

const { db } = await import("../src/db.js");
const { seedIfEmpty } = await import("../src/seed.js");
const { createApp } = await import("../src/app.js");
const { recoverPending, containsWholeTerm } = await import("../src/evaluator.js");

seedIfEmpty();

let server, base, limitedServer, limitedBase;
const tokens = {};

before(async () => {
  server = createApp({ authRateLimitMax: 1000 }).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  limitedServer = createApp({ authRateLimitMax: 3 }).listen(0);
  limitedBase = `http://127.0.0.1:${limitedServer.address().port}/api`;

  tokens.elena = (await login("elena.marsh@evalqueue.edu")).body.token;
  tokens.priya = (await login("priya@evalqueue.edu")).body.token;
  tokens.marcus = (await login("marcus@evalqueue.edu")).body.token;
});

after(() => {
  server.close();
  limitedServer.close();
  db.close();
  fs.rmSync(process.env.DB_DIR, { recursive: true, force: true });
});

async function call(method, url, { token, body, root = base } = {}) {
  const res = await fetch(root + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
function login(email, password = "Passw0rd!", root = base) {
  return call("POST", "/auth/login", { body: { email, password }, root });
}

async function waitFor(fn, ms = 1500) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}

async function createAssignment(keywords = "alpha, beta, gamma, delta") {
  const r = await call("POST", "/assignments", {
    token: tokens.elena,
    body: { title: "Test", description: "Desc", required_keywords: keywords },
  });
  return r.body.assignment;
}

test("T1 health endpoint responds", async () => {
  const r = await call("GET", "/health");
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
});

test("T2 login with valid credentials returns a token", async () => {
  const r = await login("elena.marsh@evalqueue.edu");
  assert.equal(r.status, 200);
  assert.ok(r.body.token);
});

test("T3 login with wrong password is rejected", async () => {
  const r = await login("priya@evalqueue.edu", "wrong");
  assert.equal(r.status, 401);
  assert.equal(r.body.token, undefined);
});

test("T4/T5 missing and malformed tokens are rejected", async () => {
  assert.equal((await call("GET", "/submissions")).status, 401);
  assert.equal((await call("GET", "/submissions", { token: "abc" })).status, 401);
});

test("T6 student cannot create assignments (RBAC)", async () => {
  const r = await call("POST", "/assignments", {
    token: tokens.priya,
    body: { title: "x", description: "y", required_keywords: "a" },
  });
  assert.equal(r.status, 403);
});

test("T7 instructor creates an assignment", async () => {
  const a = await createAssignment();
  assert.ok(a.id);
});

test("T20 assignment without any keyword is rejected", async () => {
  const r = await call("POST", "/assignments", {
    token: tokens.elena,
    body: { title: "t", description: "d", required_keywords: " , " },
  });
  assert.equal(r.status, 400);
});

test("T8 instructor cannot submit essays", async () => {
  const a = await createAssignment();
  const r = await call("POST", "/submissions", {
    token: tokens.elena,
    body: { assignment_id: a.id, content: "long enough content for the test" },
  });
  assert.equal(r.status, 403);
});

test("T9 too-short essays are rejected", async () => {
  const a = await createAssignment();
  const r = await call("POST", "/submissions", {
    token: tokens.priya,
    body: { assignment_id: a.id, content: "short" },
  });
  assert.equal(r.status, 400);
});

test("T10-T12 submission returns Pending and is evaluated asynchronously (75)", async () => {
  const a = await createAssignment();
  const r = await call("POST", "/submissions", {
    token: tokens.priya,
    body: {
      assignment_id: a.id,
      content: "We need Alpha and BETA but also gamma in this essay text body.",
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.submission.status, "Pending");
  const id = r.body.submission.id;
  const done = await waitFor(async () => {
    const s = (await call("GET", `/submissions/${id}`, { token: tokens.priya })).body.submission;
    return s.status === "Evaluated" ? s : null;
  });
  assert.ok(done, "submission was not evaluated in time");
  assert.equal(done.similarity_score, 75);
});

test("keyword matching uses whole terms ('bias' does not match 'unbiased')", () => {
  assert.equal(containsWholeTerm("an unbiased view", "bias"), false);
  assert.equal(containsWholeTerm("bias, in general", "bias"), true);
  assert.equal(containsWholeTerm("rising sea-level risk", "sea-level"), true);
  assert.equal(containsWholeTerm("price is $5 (approx.)", "(approx.)"), true);
});

test("T13/T14 students only see their own submissions", async () => {
  const mine = await call("GET", "/submissions", { token: tokens.marcus });
  assert.ok(mine.body.submissions.length > 0);
  assert.ok(mine.body.submissions.every((s) => s.student_name === "Marcus Okafor"));
  const seededOfPriya = db
    .prepare("SELECT s.id FROM submissions s JOIN users u ON u.id=s.student_id WHERE u.email='priya@evalqueue.edu' LIMIT 1")
    .get();
  const r = await call("GET", `/submissions/${seededOfPriya.id}`, { token: tokens.marcus });
  assert.equal(r.status, 403);
});

test("T15-T17 grading: students forbidden, range enforced, grade stored beside score", async () => {
  const a = await createAssignment();
  const created = await call("POST", "/submissions", {
    token: tokens.priya,
    body: { assignment_id: a.id, content: "alpha beta gamma delta and some more text here" },
  });
  const id = created.body.submission.id;
  assert.equal((await call("PATCH", `/submissions/${id}/grade`, { token: tokens.priya, body: { final_grade: 90 } })).status, 403);
  assert.equal((await call("PATCH", `/submissions/${id}/grade`, { token: tokens.elena, body: { final_grade: 101 } })).status, 400);
  const ok = await call("PATCH", `/submissions/${id}/grade`, {
    token: tokens.elena,
    body: { final_grade: 85, instructor_feedback: "Good." },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.submission.status, "Graded");
  assert.equal(ok.body.submission.final_grade, 85);
});

test("US-12 evaluator does not overwrite graded work", async () => {
  const graded = db.prepare("SELECT id, similarity_score, final_grade FROM submissions WHERE status='Graded' LIMIT 1").get();
  db.prepare("UPDATE submissions SET status='Graded' WHERE id=?").run(graded.id);
  recoverPending();
  await new Promise((r) => setTimeout(r, 100));
  const after = db.prepare("SELECT similarity_score, final_grade, status FROM submissions WHERE id=?").get(graded.id);
  assert.equal(after.status, "Graded");
  assert.equal(after.final_grade, graded.final_grade);
});

test("T18/T19 registration validates duplicates and password length", async () => {
  const dup = await call("POST", "/auth/register", {
    body: { name: "P", email: "priya@evalqueue.edu", password: "secret1" },
  });
  assert.equal(dup.status, 409);
  const weak = await call("POST", "/auth/register", {
    body: { name: "P", email: "new1@x.de", password: "abc" },
  });
  assert.equal(weak.status, 400);
});

test("registration defaults to Student", async () => {
  const r = await call("POST", "/auth/register", {
    body: { name: "Sam", email: "sam@x.de", password: "secret1" },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, "Student");
});

test("privilege escalation: Instructor registration requires the invite code", async () => {
  const none = await call("POST", "/auth/register", {
    body: { name: "Eve", email: "eve@x.de", password: "secret1", role: "Instructor" },
  });
  assert.equal(none.status, 403);
  const wrong = await call("POST", "/auth/register", {
    body: { name: "Eve", email: "eve@x.de", password: "secret1", role: "Instructor", inviteCode: "nope" },
  });
  assert.equal(wrong.status, 403);
  const right = await call("POST", "/auth/register", {
    body: { name: "Ian", email: "ian@x.de", password: "secret1", role: "Instructor", inviteCode: "invite-123" },
  });
  assert.equal(right.status, 201);
  assert.equal(right.body.user.role, "Instructor");
});

test("instructors can only see and grade submissions of their own assignments", async () => {
  const ian = (await login("ian@x.de", "secret1")).body.token;
  const list = await call("GET", "/submissions", { token: ian });
  assert.equal(list.body.submissions.length, 0);
  const someId = db.prepare("SELECT id FROM submissions LIMIT 1").get().id;
  assert.equal((await call("GET", `/submissions/${someId}`, { token: ian })).status, 403);
  assert.equal((await call("PATCH", `/submissions/${someId}/grade`, { token: ian, body: { final_grade: 50 } })).status, 403);
});

test("T21 recovery sweep evaluates submissions left Pending", async () => {
  const a = await createAssignment("alpha, beta");
  const studentId = db.prepare("SELECT id FROM users WHERE email='priya@evalqueue.edu'").get().id;
  const info = db
    .prepare("INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?,?,?, 'Pending')")
    .run(a.id, studentId, "alpha is here but nothing else of note");
  assert.ok(recoverPending() >= 1);
  const row = await waitFor(() => {
    const r = db.prepare("SELECT status, similarity_score FROM submissions WHERE id=?").get(info.lastInsertRowid);
    return r.status === "Evaluated" ? r : null;
  });
  assert.ok(row);
  assert.equal(row.similarity_score, 50);
});

test("rate limiting slows repeated login attempts", async () => {
  const codes = [];
  for (let i = 0; i < 5; i++) {
    codes.push((await login("priya@evalqueue.edu", "wrong", limitedBase)).status);
  }
  assert.deepEqual(codes.slice(0, 3), [401, 401, 401]);
  assert.equal(codes[4], 429);
});

test("malformed JSON yields 400, not 500", async () => {
  const res = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ not json",
  });
  assert.equal(res.status, 400);
});
