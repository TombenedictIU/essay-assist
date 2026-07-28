import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { seedIfEmpty } from "./seed.js";
import authRoutes from "./routes/auth.routes.js";
import assignmentRoutes from "./routes/assignments.routes.js";
import submissionRoutes from "./routes/submissions.routes.js";

seedIfEmpty();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`[evalqueue] backend listening on :${PORT}`);
});
