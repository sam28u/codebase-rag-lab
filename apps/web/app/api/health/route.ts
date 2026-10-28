import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@repo/db";
import { Redis } from "ioredis";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {
    status: "ok",
    version: process.env.npm_package_version ?? "0.0.0",
    ts: new Date().toISOString(),
  };

  let healthy = true;

  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    out.db = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    healthy = false;
    out.db = { ok: false, error: String(e) };
  }

  try {
    const t0 = Date.now();
    const r = new Redis(process.env.REDIS_URL!, { lazyConnect: true });
    await r.connect();
    const pong = await r.ping();
    await r.quit();
    out.redis = { ok: pong === "PONG", ms: Date.now() - t0 };
  } catch (e) {
    healthy = false;
    out.redis = { ok: false, error: String(e) };
  }

  out.status = healthy ? "ok" : "degraded";
  return NextResponse.json(out, { status: healthy ? 200 : 503 });
}