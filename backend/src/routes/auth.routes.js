import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../auth.js";

const router = Router();

router.post("/register", (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role required" });
  }
  if (role !== "Student" && role !== "Instructor") {
    return res.status(400).json({ error: "role must be Student or Instructor" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "email already registered" });

  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name.trim(), String(email).trim().toLowerCase(), hashPassword(password), role);

  const user = db
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  const row = db
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
    .get(String(email).trim().toLowerCase());
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.json({ token: signToken(user), user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
