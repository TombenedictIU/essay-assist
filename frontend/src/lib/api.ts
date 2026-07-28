export type Role = "Student" | "Instructor";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  required_keywords: string;
  created_at: string;
  instructor_name: string;
}

export type SubmissionStatus = "Pending" | "Evaluated" | "Graded";

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  status: SubmissionStatus;
  similarity_score: number | null;
  final_grade: number | null;
  instructor_feedback: string | null;
  created_at: string;
  assignment_title: string;
  required_keywords: string;
  student_name: string;
  student_email: string;
}

const TOKEN_KEY = "evalqueue_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (!location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string; role: Role }) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: User }>("/auth/me"),

  listAssignments: () => request<{ assignments: Assignment[] }>("/assignments"),
  getAssignment: (id: number | string) =>
    request<{ assignment: Assignment }>(`/assignments/${id}`),
  createAssignment: (body: {
    title: string;
    description: string;
    required_keywords: string;
  }) =>
    request<{ assignment: Assignment }>("/assignments", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSubmissions: () => request<{ submissions: Submission[] }>("/submissions"),
  getSubmission: (id: number | string) =>
    request<{ submission: Submission }>(`/submissions/${id}`),
  createSubmission: (body: { assignment_id: number; content: string }) =>
    request<{ submission: Submission }>("/submissions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  gradeSubmission: (
    id: number | string,
    body: { final_grade: number; instructor_feedback: string }
  ) =>
    request<{ submission: Submission }>(`/submissions/${id}/grade`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
