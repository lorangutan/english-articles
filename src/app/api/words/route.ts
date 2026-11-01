import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeWord } from "@/lib/dictionary";
import { readerIdFrom } from "@/lib/reader";

export const dynamic = "force-dynamic";

// A reader's notebook: every word they look up, how often, and whether it is in their
// flashcard deck. Keyed by the anonymous id the browser sends in X-Reader-Id.

export type NotebookWord = {
  word: string;
  definition: string | null;
  context: string | null;
  articleId: number | null;
  articleTitle: string | null;
  lookups: number;
  inDeck: boolean;
  quizRight: number;
  quizWrong: number;
  lastSeenAt: string;
};

const missingReader = () => NextResponse.json({ error: "Missing reader id" }, { status: 400 });

export async function GET(req: NextRequest) {
  const reader = readerIdFrom(req);
  if (!reader) return missingReader();
  const [rows] = await db().execute(
    `SELECT w.word, w.definition, w.context, w.article_id AS articleId, a.title AS articleTitle,
            w.lookups, w.in_deck AS inDeck, w.quiz_right AS quizRight, w.quiz_wrong AS quizWrong,
            w.last_seen_at AS lastSeenAt
       FROM saved_words w LEFT JOIN articles a ON a.id = w.article_id
      WHERE w.reader_id = ? ORDER BY w.last_seen_at DESC LIMIT 1000`,
    [reader],
  );
  const words = (rows as NotebookWord[]).map((w) => ({ ...w, inDeck: Boolean(w.inDeck) }));
  return NextResponse.json({ words });
}

/**
 * Notes a word. `lookup: true` counts a tap (and refreshes definition/context);
 * `inDeck` adds or removes it from the flashcard deck.
 */
export async function POST(req: NextRequest) {
  const reader = readerIdFrom(req);
  if (!reader) return missingReader();
  const body = (await req.json().catch(() => ({}))) as {
    word?: string; definition?: string; context?: string; articleId?: number; lookup?: boolean; inDeck?: boolean;
  };
  const word = normalizeWord(body.word ?? "");
  if (!word || word.length > 64) return NextResponse.json({ error: "Invalid word" }, { status: 400 });

  const lookup = body.lookup ? 1 : 0;
  const inDeck = typeof body.inDeck === "boolean" ? Number(body.inDeck) : null;
  await db().execute(
    `INSERT INTO saved_words (reader_id, word, definition, context, article_id, lookups, in_deck)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 0))
     ON DUPLICATE KEY UPDATE
       lookups      = lookups + VALUES(lookups),
       definition   = COALESCE(VALUES(definition), definition),
       context      = COALESCE(VALUES(context), context),
       article_id   = COALESCE(VALUES(article_id), article_id),
       in_deck      = COALESCE(?, in_deck),
       last_seen_at = IF(VALUES(lookups) > 0, CURRENT_TIMESTAMP, last_seen_at)`,
    [reader, word, body.definition?.slice(0, 600) ?? null, body.context?.slice(0, 600) ?? null,
      Number.isInteger(body.articleId) ? body.articleId! : null, lookup, inDeck, inDeck],
  );
  const [rows] = await db().execute(
    "SELECT lookups, in_deck AS inDeck FROM saved_words WHERE reader_id = ? AND word = ?",
    [reader, word],
  );
  const row = (rows as { lookups: number; inDeck: number }[])[0];
  return NextResponse.json({ word, lookups: row?.lookups ?? 0, inDeck: Boolean(row?.inDeck) });
}

/** Bulk deck changes from the notebook: { words: [...], inDeck: true|false }. */
export async function PATCH(req: NextRequest) {
  const reader = readerIdFrom(req);
  if (!reader) return missingReader();
  const body = (await req.json().catch(() => ({}))) as { words?: string[]; inDeck?: boolean };
  const words = (body.words ?? []).map(normalizeWord).filter(Boolean).slice(0, 1000);
  if (!words.length || typeof body.inDeck !== "boolean") {
    return NextResponse.json({ error: "Expected words and inDeck" }, { status: 400 });
  }
  await db().query(
    `UPDATE saved_words SET in_deck = ? WHERE reader_id = ? AND word IN (${words.map(() => "?").join(",")})`,
    [Number(body.inDeck), reader, ...words],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const reader = readerIdFrom(req);
  const word = normalizeWord(req.nextUrl.searchParams.get("word") ?? "");
  if (!reader || !word) return NextResponse.json({ error: "Missing reader id or word" }, { status: 400 });
  await db().execute("DELETE FROM saved_words WHERE reader_id = ? AND word = ?", [reader, word]);
  return NextResponse.json({ ok: true });
}
