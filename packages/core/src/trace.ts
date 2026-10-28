import { db, traces } from "@repo/db";

type Stage = { name: string; ms: number; meta?: Record<string, unknown> };

export class TraceContext {
  private stages: Stage[] = [];
  private start = Date.now();
  private meta: Record<string, unknown> = {};
  private current: { name: string; t0: number } | null = null;

  constructor(
    public readonly opts: { jobId?: string; queryId?: string } = {},
  ) {}

  startStage(name: string) {
    this.current = { name, t0: Date.now() };
  }

  endStage(meta?: Record<string, unknown>) {
    if (!this.current) return;
    this.stages.push({
      name: this.current.name,
      ms: Date.now() - this.current.t0,
      meta,
    });
    this.current = null;
  }

  addMeta(key: string, value: unknown) {
    this.meta[key] = value;
  }

  async flush() {
    if (process.env.TRACE_ENABLED !== "true") return;
    const totalMs = Date.now() - this.start;
    const costUsd = String(this.meta["cost_usd"] ?? "0");
    await db.insert(traces).values({
      jobId: this.opts.jobId ?? null,
      queryId: this.opts.queryId ?? null,
      stages: JSON.parse(JSON.stringify(this.stages)),
      totalMs,
      costUsd,
    });
  }
}