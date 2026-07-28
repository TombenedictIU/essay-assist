import type { SubmissionStatus } from "../lib/api";
import { CheckCircle2, Clock, FileCheck2 } from "lucide-react";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map = {
    Pending: {
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    Evaluated: {
      cls: "bg-brand-50 text-brand-700 ring-brand-200",
      icon: <FileCheck2 className="h-3.5 w-3.5" />,
    },
    Graded: {
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${map.cls}`}
    >
      {map.icon}
      {status}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
