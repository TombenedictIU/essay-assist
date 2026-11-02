import { seedIfEmpty } from "./seed.js";
import { recoverPending } from "./evaluator.js";
import { createApp } from "./app.js";

seedIfEmpty();
recoverPending(); // re-schedule evaluations that were interrupted by a restart

const PORT = Number(process.env.PORT) || 4000;
createApp().listen(PORT, () => {
  console.log(`[evalqueue] backend listening on :${PORT}`);
});
