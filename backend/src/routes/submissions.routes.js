import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { scheduleEvaluation } from "../evaluator.js";

const router = Router();
router.use(requireAuth);

const SELECT_SUBMISSION = `
  SELECT s.id, s.assignment_id, s.student_id, s.content, s.status,
         s.similarity_score, s.final_grade, s.instructor_feedback, s.created_at,
         a.title AS assignment_title, a.required_keywords, a.instructor_id,
         u.name  AS student_name, u.email AS student_email
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN users u       ON u.id = s.student_id
`;

router.get("/", (req, res) => {
  const rows =
    req.user.role === "Instructor"
      ? db
          .prepare(`${SELECT_SUBMISSION} WHERE a.instructor_id = ? ORDER BY s.created_at DESC`)
          .all(req.user.id)
      : db
          .prepare(`${SELECT_SUBMISSION} WHERE s.student_id = ? ORDER BY s.created_at DESC`)
          .all(req.user.id);
  res.json({ submissions: rows });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`${SELECT_SUBMISSION} WHERE s.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  if (req.user.role === "Student" && row.student_id !== req.user.id) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (req.user.role === "Instructor" && row.instructor_id !== req.user.id) {
    return res.status(403).json({ error: "forbidden" });
  }
  res.json({ submission: row });
});

router.post("/", requireRole("Student"), (req, res) => {
  const { assignment_id, content } = req.body || {};
  if (!assignment_id || !content) {
    return res.status(400).json({ error: "assignment_id and content required" });
  }
  if (String(content).trim().length < 20) {
    return res.status(400).json({ error: "content too short" });
  }
  const assignment = db.prepare("SELECT id FROM assignments WHERE id = ?").get(assignment_id);
  if (!assignment) return res.status(404).json({ error: "assignment not found" });

  const info = db
    .prepare(
      `INSERT INTO submissions (assignment_id, student_id, content, status)
       VALUES (?, ?, ?, 'Pending')`
    )
    .run(assignment_id, req.user.id, String(content));

  scheduleEvaluation(info.lastInsertRowid);

  const submission = db
    .prepare(`${SELECT_SUBMISSION} WHERE s.id = ?`)
    .get(info.lastInsertRowid);
  res.status(201).json({ submission });
});

router.patch("/:id/grade", requireRole("Instructor"), (req, res) => {
  const { final_grade, instructor_feedback } = req.body || {};
  const grade = Number(final_grade);
  if (!Number.isInteger(grade) || grade < 0 || grade > 100) {
    return res.status(400).json({ error: "final_grade must be an integer 0-100" });
  }
  const existing = db
    .prepare(
      `SELECT s.id, a.instructor_id
         FROM submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = ?`
    )
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  // Instructors may only grade submissions for their own assignments.
  if (existing.instructor_id !== req.user.id) {
    return res.status(403).json({ error: "forbidden" });
  }

  db.prepare(
    `UPDATE submissions
        SET final_grade = ?, instructor_feedback = ?, status = 'Graded'
      WHERE id = ?`
  ).run(grade, instructor_feedback || null, req.params.id);

  const submission = db.prepare(`${SELECT_SUBMISSION} WHERE s.id = ?`).get(req.params.id);
  res.json({ submission });
});

export default router;
