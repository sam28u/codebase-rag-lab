import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, repos } from "@repo/db";
import { TraceContext } from "@repo/core";
import { connection, INDEX_QUEUE } from "./queues.js";

type IndexJob = { repoId: string };

const processor = async (job: Job<IndexJob>) => {
  const { repoId } = job.data;
  const trace = new TraceContext({ jobId: job.id });
  trace.startStage("bootstrap");

  // Phase 0: prove the pipeline. Real work lands in Phase 1.
  console.log(`[worker] picked up job ${job.id} for repo ${repoId}`);
  await db.update(repos).set({ status: "indexing" }).where(eq(repos.id, repoId));
  trace.endStage({ repoId });

  trace.startStage("sleep_mock");
  await new Promise((r) => setTimeout(r, 500));
  trace.endStage();

  await db.update(repos).set({ status: "ready", indexedAt: new Date() }).where(eq(repos.id, repoId));
  await trace.flush();
  return { repoId, ok: true };
};

const worker = new Worker<IndexJob>(INDEX_QUEUE, processor, {
  connection,
  concurrency: 2,
});

worker.on("completed", (job) => console.log(`[worker] done ${job.id}`));
worker.on("failed",  (job, err) => console.error(`[worker] failed ${job?.id}: ${err.message}`));

console.log("[worker] listening on:", INDEX_QUEUE);

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});