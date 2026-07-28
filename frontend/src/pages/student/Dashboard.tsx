import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Assignment, type Submission } from "../../lib/api";
import { Card, PageHeader, StatusBadge } from "../../components/ui";

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listAssignments(), api.listSubmissions()])
      .then(([a, s]) => {
        setAssignments(a.assignments);
        setSubmissions(s.submissions);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignment_id));

  return (
    <div>
      <PageHeader
        title="Student dashboard"
        subtitle="Browse assignments and track your submissions."
      />
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card title="Available assignments">
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignments.map((a) => {
                const already = submittedAssignmentIds.has(a.id);
                return (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{a.title}</div>
                      <div className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                        {a.description}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        by {a.instructor_name}
                      </div>
                    </div>
                    {already ? (
                      <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
                        Submitted
                      </span>
                    ) : (
                      <Link
                        to={`/student/assignments/${a.id}/submit`}
                        className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
                      >
                        Submit
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div id="submissions" />
        <Card title="My submissions">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">You haven't submitted anything yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">Assignment</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Similarity</th>
                    <th className="py-2 pr-3 font-medium">Grade</th>
                    <th className="py-2 pr-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 text-slate-800">{s.assignment_title}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">
                        {s.similarity_score != null ? `${s.similarity_score}%` : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">
                        {s.final_grade != null ? `${s.final_grade}` : "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/student/submissions/${s.id}`}
                          className="text-brand-700 hover:underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
