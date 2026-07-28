import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, type Submission } from "../../lib/api";
import { Card, PageHeader, StatusBadge } from "../../components/ui";

export default function MySubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const r = await api.getSubmission(id!);
        if (cancelled) return;
        setSub(r.submission);
        // Poll while pending to demonstrate async evaluation transition.
        if (r.submission.status === "Pending") {
          timer = setTimeout(load, 2000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (!sub) {
    return (
      <div className="text-sm text-slate-500">
        {error || "Loading submission…"}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/student")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>
      <PageHeader
        title={sub.assignment_title}
        subtitle={`Submitted ${new Date(sub.created_at).toLocaleString()}`}
        action={<StatusBadge status={sub.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Your essay">
            <div className="prose-essay text-[15px]">{sub.content}</div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Result">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Similarity score
                </div>
                <div className="text-3xl font-semibold text-brand-700">
                  {sub.similarity_score != null ? `${sub.similarity_score}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Final grade
                </div>
                <div className="text-3xl font-semibold text-emerald-700">
                  {sub.final_grade != null ? sub.final_grade : "Pending"}
                </div>
              </div>
            </div>
          </Card>
          {sub.instructor_feedback && (
            <Card title="Instructor feedback">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {sub.instructor_feedback}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
