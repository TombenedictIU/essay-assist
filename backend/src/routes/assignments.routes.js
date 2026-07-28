import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.description, a.required_keywords, a.created_at,
              u.name AS instructor_name
         FROM assignments a
         JOIN users u ON u.id = a.instructor_id
        ORDER BY a.created_at DESC`
    )
    .all();
  res.json({ assignments: rows });
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT a.id, a.title, a.description, a.required_keywords, a.created_at,
              u.name AS instructor_name
         FROM assignments a
         JOIN users u ON u.id = a.instructor_id
        WHERE a.id = ?`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json({ assignment: row });
});

router.post("/", requireRole("Instructor"), (req, res) => {
  const { title, description, required_keywords } = req.body || {};
  if (!title || !description || !required_keywords) {
    return res
      .status(400)
      .json({ error: "title, description, required_keywords required" });
  }
  const keywords = String(required_keywords)
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) {
    return res.status(400).json({ error: "at least one keyword required" });
  }
  const info = db
    .prepare(
      `INSERT INTO assignments (instructor_id, title, description, required_keywords)
       VALUES (?, ?, ?, ?)`
    )
    .run(req.user.id, title.trim(), description.trim(), keywords.join(", "));

  const assignment = db
    .prepare(
      `SELECT a.id, a.title, a.description, a.required_keywords, a.created_at,
              u.name AS instructor_name
         FROM assignments a
         JOIN users u ON u.id = a.instructor_id
        WHERE a.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json({ assignment });
});

export default router;
