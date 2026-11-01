import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeWord } from "@/lib/dictionary";
import { readerIdFrom } from "@/lib/reader";

export const dynamic = "force-dynamic";

// POST /api/words/quiz  { word, correct }  — records one quiz answer.
export async function POST(req: NextRequest) {
  const reader = readerIdFrom(req);
  const body = (await req.json().catch(() => ({}))) as { word?: string; correct?: boolean };
  const word = normalizeWord(body.word ?? "");
  if (!reader || !word || typeof body.correct !== "boolean") {
    return NextResponse.json({ error: "Expected reader id, word and correct" }, { status: 400 });
  }
  const column = body.correct ? "quiz_right" : "quiz_wrong";
  await db().execute(`UPDATE saved_words SET ${column} = ${column} + 1 WHERE reader_id = ? AND word = ?`, [reader, word]);
  return NextResponse.json({ ok: true });
}
