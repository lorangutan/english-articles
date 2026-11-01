import { NextResponse, type NextRequest } from "next/server";
import { COMMON_WORDS } from "@/lib/common-words";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/words/distractors?n=12 — real dictionary words (from the shared lookup cache)
// used as wrong answers when a reader's own notebook is too small for a 4-option quiz.
export async function GET(req: NextRequest) {
  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get("n")) || 12, 1), 40);
  const [rows] = await db().query(
    `SELECT word FROM word_cache WHERE payload IS NOT NULL AND CHAR_LENGTH(word) BETWEEN 4 AND 14
      ORDER BY RAND() LIMIT ${n}`,
  );
  const words = (rows as { word: string }[]).map((r) => r.word);
  // A new site has a small cache, so top up with longer everyday words.
  const pool = [...COMMON_WORDS].filter((w) => w.length >= 6 && !words.includes(w));
  while (words.length < n && pool.length) words.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return NextResponse.json({ words });
}
