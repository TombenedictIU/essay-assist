import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/api";
import { AuthLayout, Field } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await register(name, email, password, role, role === "Instructor" ? inviteCode : undefined);
      navigate(user.role === "Instructor" ? "/instructor" : "/student", {
        replace: true,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" value={name} onChange={setName} required />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            I am a…
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["Student", "Instructor"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  role === r
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {role === "Instructor" && (
          <Field
            label="Instructor invite code"
            value={inviteCode}
            onChange={setInviteCode}
            required
          />
        )}
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
