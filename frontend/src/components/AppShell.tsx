import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import type { ReactNode } from "react";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Outlet />;

  const isInstructor = user.role === "Instructor";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-700 text-white grid place-items-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">EvalQueue</div>
              <div className="text-xs text-slate-500 -mt-0.5">
                Automated Essay Evaluation
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        <aside className="w-56 shrink-0">
          <nav className="space-y-1">
            {isInstructor ? (
              <>
                <NavItem to="/instructor" end icon={<LayoutDashboard className="h-4 w-4" />}>
                  Dashboard
                </NavItem>
                <NavItem
                  to="/instructor/assignments/new"
                  icon={<PlusCircle className="h-4 w-4" />}
                >
                  New assignment
                </NavItem>
              </>
            ) : (
              <>
                <NavItem to="/student" end icon={<LayoutDashboard className="h-4 w-4" />}>
                  Dashboard
                </NavItem>
                <NavItem to="/student#submissions" icon={<FileText className="h-4 w-4" />}>
                  My submissions
                </NavItem>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  children,
  icon,
  end,
}: {
  to: string;
  children: ReactNode;
  icon: ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
          isActive
            ? "bg-brand-50 text-brand-800 font-medium"
            : "text-slate-600 hover:bg-slate-100"
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
