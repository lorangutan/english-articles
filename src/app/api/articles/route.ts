import { NextResponse, type NextRequest } from "next/server";
import { randomArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

// GET /api/articles?band=2&topics=science,food&exclude=4,9&limit=7
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const band = Number(q.get("band"));
  if (![1, 2, 3, 4].includes(band)) return NextResponse.json({ error: "band must be 1–4" }, { status: 400 });
  const topics = (q.get("topics") ?? "").split(",").filter(Boolean);
  const exclude = (q.get("exclude") ?? "").split(",").map(Number).filter(Number.isInteger);
  try {
    const articles = await randomArticles(band, topics, Number(q.get("limit") ?? 7), exclude);
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[api/articles]", err);
    return NextResponse.json({ error: "Library unavailable" }, { status: 500 });
  }
}
