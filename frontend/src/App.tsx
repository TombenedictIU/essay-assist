import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, ProtectedRoute } from "./lib/auth";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InstructorDashboard from "./pages/instructor/Dashboard";
import NewAssignment from "./pages/instructor/NewAssignment";
import GradeSubmission from "./pages/instructor/GradeSubmission";
import StudentDashboard from "./pages/student/Dashboard";
import SubmitAssignment from "./pages/student/SubmitAssignment";
import MySubmission from "./pages/student/MySubmission";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={
              user
                ? user.role === "Instructor"
                  ? "/instructor"
                  : "/student"
                : "/login"
            }
            replace
          />
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route
          path="/instructor"
          element={
            <ProtectedRoute role="Instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/assignments/new"
          element={
            <ProtectedRoute role="Instructor">
              <NewAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/submissions/:id"
          element={
            <ProtectedRoute role="Instructor">
              <GradeSubmission />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="Student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments/:id/submit"
          element={
            <ProtectedRoute role="Student">
              <SubmitAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/submissions/:id"
          element={
            <ProtectedRoute role="Student">
              <MySubmission />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
