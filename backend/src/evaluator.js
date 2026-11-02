import { db } from "./db.js";

/**
 * Asynchronously evaluate a submission by counting required-keyword hits.
 * Runs on the next tick so POST /submissions returns immediately.
 */
export function scheduleEvaluation(submissionId) {
  setImmediate(() => {
    try {
      evaluateNow(submissionId);
    } catch (err) {
      console.error(`[evaluator] failed for submission ${submissionId}:`, err);
    }
  });
}

export function evaluateNow(submissionId) {
  const row = db
    .prepare(
      `SELECT s.id, s.content, s.status, a.required_keywords
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = ?`
    )
    .get(submissionId);

  if (!row) return;
  if (row.status !== "Pending") return; // don't re-evaluate graded work

  const keywords = row.required_keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const text = row.content.toLowerCase();
  const hits = keywords.filter((k) => containsWholeTerm(text, k)).length;
  const score = keywords.length
    ? Math.round((hits / keywords.length) * 100)
    : 0;

  db.prepare(
    `UPDATE submissions
        SET similarity_score = ?, status = 'Evaluated'
      WHERE id = ? AND status = 'Pending'`
  ).run(score, submissionId);

  console.log(
    `[evaluator] submission ${submissionId} scored ${score} (${hits}/${keywords.length})`
  );
}

/**
 * Whole-term matching: "bias" must not match "unbiased".
 * A term matches when it is not directly preceded or followed by a letter or digit.
 */
export function containsWholeTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(text);
}

/**
 * Start-up recovery: re-schedule every submission that is still Pending,
 * e.g. because the process stopped before the deferred evaluation ran.
 * Returns the number of submissions scheduled.
 */
export function recoverPending() {
  const rows = db.prepare("SELECT id FROM submissions WHERE status = 'Pending'").all();
  rows.forEach((r) => scheduleEvaluation(r.id));
  if (rows.length) console.log(`[evaluator] recovery sweep scheduled ${rows.length} pending submission(s)`);
  return rows.length;
}
