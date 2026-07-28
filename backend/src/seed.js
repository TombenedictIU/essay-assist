import { db } from "./db.js";
import { hashPassword } from "./auth.js";

export function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  if (count > 0) return;

  console.log("[seed] initializing database with demo data");

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  );
  const pw = hashPassword("Passw0rd!");

  const instructorId = insertUser.run(
    "Dr. Elena Marsh",
    "elena.marsh@evalqueue.edu",
    pw,
    "Instructor"
  ).lastInsertRowid;

  const priyaId = insertUser.run(
    "Priya Ramanathan",
    "priya@evalqueue.edu",
    pw,
    "Student"
  ).lastInsertRowid;

  const marcusId = insertUser.run(
    "Marcus Okafor",
    "marcus@evalqueue.edu",
    pw,
    "Student"
  ).lastInsertRowid;

  const insertAssignment = db.prepare(
    `INSERT INTO assignments (instructor_id, title, description, required_keywords)
     VALUES (?, ?, ?, ?)`
  );

  const ethicsId = insertAssignment.run(
    instructorId,
    "The Ethics of Algorithmic Decision-Making",
    "Write a 600-word essay examining the ethical trade-offs of deploying automated decision systems in high-stakes public domains such as criminal sentencing, credit scoring, or child welfare. Ground your argument in at least two documented case studies.",
    "accountability, bias, transparency, fairness, oversight"
  ).lastInsertRowid;

  const climateId = insertAssignment.run(
    instructorId,
    "Climate Adaptation in Coastal Cities",
    "Compare adaptation strategies employed by two coastal metropolitan regions facing accelerating sea-level rise. Evaluate the effectiveness of engineered defenses, ecosystem-based approaches, and managed retreat.",
    "resilience, infrastructure, mitigation, sea-level, policy"
  ).lastInsertRowid;

  const insertSubmission = db.prepare(
    `INSERT INTO submissions
      (assignment_id, student_id, content, status, similarity_score, final_grade, instructor_feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // 1) Priya on Ethics — Graded
  insertSubmission.run(
    ethicsId,
    priyaId,
    "Algorithmic decision-making systems now mediate outcomes that were once the exclusive province of human judgment. When a pretrial risk model recommends detention or a credit scorer denies a loan, the demand for accountability shifts from an identifiable clerk to a diffuse technical pipeline. The COMPAS case illustrated how opaque scoring can encode historical bias against Black defendants, while the Apple Card investigation exposed disparate credit limits between spouses sharing finances. Meaningful transparency requires more than publishing a model card: it requires disclosure of training data provenance, error rates disaggregated by subgroup, and the appeal channels available to those adversely affected. Fairness, in turn, is not a single metric but a family of incompatible constraints, and choosing among them is a normative act that deserves democratic oversight rather than quiet engineering defaults.",
    "Graded",
    80,
    88,
    "Excellent grounding in the COMPAS and Apple Card cases. Your treatment of transparency as multi-layered—data provenance, subgroup metrics, appeal channels—is exactly the level of specificity I was looking for. Push harder next time on the trade-offs between competing fairness definitions; you gesture at them but do not resolve which you would prioritize and why."
  );

  // 2) Marcus on Ethics — Evaluated (auto-scored, awaiting grade)
  insertSubmission.run(
    ethicsId,
    marcusId,
    "Automated decision systems raise urgent questions about who bears responsibility when they fail. In the Dutch childcare benefits scandal, a fraud-detection algorithm flagged tens of thousands of families—disproportionately those with dual nationality—as suspicious, triggering ruinous clawbacks with no meaningful recourse. The scandal ultimately toppled the Rutte cabinet, but the harms took years to surface because no single official saw the full pipeline. Bias in such systems is rarely the product of malicious intent; it emerges from proxy variables that correlate with protected attributes and from feedback loops that reinforce past enforcement patterns. Any serious reform must pair independent audit with statutory rights of explanation, so that individuals subject to consequential decisions can contest them on the record.",
    "Evaluated",
    60,
    null,
    null
  );

  // 3) Priya on Climate — Pending (kept pending on purpose to show queue state)
  insertSubmission.run(
    climateId,
    priyaId,
    "Rotterdam and Ho Chi Minh City present instructive contrasts in coastal adaptation. Rotterdam's Room for the River program deliberately widens floodplains and lowers dikes in select locations, trading absolute defense for controlled inundation that preserves urban functionality during extreme events. Ho Chi Minh City, by comparison, has leaned heavily on ring-dike construction and pumped drainage, an approach that buys time but concentrates catastrophic risk if any single segment fails. A durable strategy will likely blend engineered defenses with restored mangrove belts and, in the most exposed districts, planned relocation of critical assets away from the shoreline.",
    "Pending",
    null,
    null,
    null
  );

  console.log("[seed] done");
}
