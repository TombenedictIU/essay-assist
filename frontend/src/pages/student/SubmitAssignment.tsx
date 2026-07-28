import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, type Assignment } from "../../lib/api";
import { Card, PageHeader } from "../../components/ui";

export default function SubmitAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getAssignment(id)
      .then((r) => setAssignment(r.assignment))
      .catch((e) => setError((e as Error).message));
  }, [id]);

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!assignment) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createSubmission({
        assignment_id: assignment.id,
        content,
      });
      navigate(`/student/submissions/${r.submission.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!assignment) {
    return (
      <div className="text-sm text-slate-500">
        {error || "Loading assignment…"}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/student")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title={assignment.title} subtitle={`by ${assignment.instructor_name}`} />

      <div className="space-y-6">
        <Card title="Prompt">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {assignment.description}
          </p>
        </Card>

        <Card title="Your essay">
          <form onSubmit={onSubmit} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="Write or paste your essay here…"
              rows={18}
              className="w-full min-h-[360px] rounded-md border border-slate-300 bg-white px-3 py-2 font-serif text-[15px] leading-relaxed text-slate-800 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{words} word{words === 1 ? "" : "s"}</span>
              <span>Auto-evaluation runs immediately after submission.</span>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button
                disabled={busy}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit essay"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
