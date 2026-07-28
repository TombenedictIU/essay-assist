import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, PageHeader } from "../../components/ui";

export default function NewAssignment() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kwPreview = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createAssignment({
        title,
        description,
        required_keywords: keywords,
      });
      navigate("/instructor", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New assignment"
        subtitle="Define the prompt and the keywords the auto-evaluator should look for."
      />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Required keywords
            </span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              required
              placeholder="e.g. accountability, bias, transparency"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Comma-separated. The similarity score is the % of these that appear
              in the student's submission.
            </span>
            {kwPreview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kwPreview.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </label>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create assignment"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
