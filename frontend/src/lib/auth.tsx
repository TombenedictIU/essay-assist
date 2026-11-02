import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, clearToken, getToken, setToken, type Role, type User } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: Role, inviteCode?: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.login({ email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const register = async (name: string, email: string, password: string, role: Role, inviteCode?: string) => {
    const r = await api.register({ name, email, password, role, inviteCode });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({
  role,
  children,
}: {
  role?: Role;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return (
      <Navigate to={user.role === "Instructor" ? "/instructor" : "/student"} replace />
    );
  }
  return <>{children}</>;
}
