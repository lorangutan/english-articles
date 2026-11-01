import { NextResponse, type NextRequest } from "next/server";
import { ingest } from "@/lib/ingest";
import { TOPICS } from "@/lib/topics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
// Each run refreshes three random topics so it stays well inside the function time limit.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const topics = [...TOPICS].sort(() => Math.random() - 0.5).slice(0, 3);
  const report = await ingest(topics, 2);
  console.log("[api/ingest]", topics.map((t) => t.slug).join(","), report);
  return NextResponse.json({ topics: topics.map((t) => t.slug), ...report });
}
