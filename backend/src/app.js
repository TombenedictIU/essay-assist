import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import assignmentRoutes from "./routes/assignments.routes.js";
import submissionRoutes from "./routes/submissions.routes.js";

/**
 * Builds the Express application (separate from listen() so it can be tested).
 * @param {{authRateLimitMax?: number}} [options]
 */
export function createApp(options = {}) {
  const app = express();

  // The API runs behind the nginx reverse proxy; trust one hop for client IPs.
  app.set("trust proxy", 1);

  app.use(helmet());

  // Same-origin in production (nginx proxy), so CORS is off unless explicitly configured.
  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(",").map((o) => o.trim());
    app.use(cors({ origin: origins }));
  }

  app.use(express.json({ limit: "1mb" }));
  if (process.env.NODE_ENV !== "test") app.use(morgan("tiny"));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Slow down brute-force attempts on login and registration.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.authRateLimitMax ?? (Number(process.env.AUTH_RATE_LIMIT_MAX) || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many attempts, please try again later" },
  });

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/submissions", submissionRoutes);

  app.use((err, _req, res, _next) => {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: "bad request" });
    }
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}
