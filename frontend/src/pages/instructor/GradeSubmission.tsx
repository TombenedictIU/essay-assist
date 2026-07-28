import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, type Submission } from "../../lib/api";
import { Card, PageHeader, StatusBadge } from "../../components/ui";

export default function GradeSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getSubmission(id)
      .then((r) => {
        setSub(r.submission);
        setGrade(
          r.submission.final_grade != null
            ? String(r.submission.final_grade)
            : r.submission.similarity_score != null
              ? String(r.submission.similarity_score)
              : ""
        );
        setFeedback(r.submission.instructor_feedback ?? "");
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 0 || g > 100) {
      setError("Grade must be an integer between 0 and 100.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.gradeSubmission(id, {
        final_grade: g,
        instructor_feedback: feedback,
      });
      setSub(r.submission);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!sub) {
    return (
      <div className="text-sm text-slate-500">
        {error || "Loading submission…"}
      </div>
    );
  }

  const keywords = sub.required_keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const contentLower = sub.content.toLowerCase();

  return (
    <div>
      <button
        onClick={() => navigate("/instructor")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>
      <PageHeader
        title={sub.assignment_title}
        subtitle={`Submitted by ${sub.student_name} · ${new Date(sub.created_at).toLocaleString()}`}
        action={<StatusBadge status={sub.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Submission">
            <div className="prose-essay text-[15px]">{sub.content}</div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Auto-evaluation">
            <div className="mb-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold text-brand-700">
                {sub.similarity_score != null ? `${sub.similarity_score}%` : "—"}
              </div>
              <div className="text-sm text-slate-500">similarity score</div>
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Keyword coverage
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k) => {
                const hit = contentLower.includes(k.toLowerCase());
                return (
                  <span
                    key={k}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      hit
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-slate-100 text-slate-500 line-through"
                    }`}
                  >
                    {k}
                  </span>
                );
              })}
            </div>
          </Card>

          <Card title="Grade">
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Final grade (0–100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Feedback
                </span>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                disabled={busy}
                className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {busy ? "Saving…" : sub.status === "Graded" ? "Update grade" : "Submit grade"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
