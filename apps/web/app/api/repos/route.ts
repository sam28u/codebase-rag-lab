import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, repos, jobs } from "@repo/db";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const Body = z.object({ url: z.string().url() });

function parseGithub(url: string) {
  const m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error("invalid github url");
  return { owner: m[1]!, name: m[2]! };
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid body", detail: String(e) }, { status: 400 });
  }

  let owner: string, name: string;
  try {
    ({ owner, name } = parseGithub(body.url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    // Upsert: find existing row by (owner, name)
    const [existing] = await db
      .select()
      .from(repos)
      .where(and(eq(repos.owner, owner), eq(repos.name, name)));

    let repoId: string;
    if (existing) {
      repoId = existing.id;
      await db.update(repos).set({ status: "queued" }).where(eq(repos.id, repoId));
    } else {
      const [inserted] = await db
        .insert(repos)
        .values({ owner, name, status: "queued" })
        .returning();
      repoId = inserted!.id;
    }

    const [job] = await db
      .insert(jobs)
      .values({ repoId, type: "index", status: "queued" })
      .returning();

    const conn = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    const q = new Queue("index-repo", { connection: conn });
    await q.add("index", { repoId }, { jobId: job!.id });
    await q.close();
    await conn.quit();

    return NextResponse.json({ repoId, jobId: job!.id });
  } catch (e) {
    console.error("[api/repos] failed:", e);
    return NextResponse.json(
      { error: "internal error", detail: (e as Error).message },
      { status: 500 }
    );
  }
}