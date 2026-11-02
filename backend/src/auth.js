import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

// Placeholder values that must never be used to sign tokens.
const PLACEHOLDER_SECRETS = new Set(["", "dev-secret-change-me", "change-me-in-production"]);

function resolveSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured && !PLACEHOLDER_SECRETS.has(configured)) return configured;
  // No usable secret configured: generate a random one for this process.
  // Tokens then become invalid on restart, which is safe and needs no setup.
  console.warn(
    "[auth] JWT_SECRET is not set (or is a placeholder); using a random per-process secret. " +
      "Set JWT_SECRET to keep sessions valid across restarts."
  );
  return crypto.randomBytes(48).toString("hex");
}

const JWT_SECRET = resolveSecret();
const JWT_EXPIRES_IN = "7d";

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
      .get(payload.sub);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

/** Constant-time string comparison (used for the instructor invite code). */
export function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}
