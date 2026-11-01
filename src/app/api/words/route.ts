import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeWord } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

// Saved words are keyed by an anonymous reader id the browser generates and sends
// in the X-Reader-Id header. No accounts, no personal data.
function readerId(req: NextRequest) {
  const id = req.headers.get("x-reader-id") ?? "";
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export async function GET(req: NextRequest) {
  const reader = readerId(req);
  if (!reader) return NextResponse.json({ error: "Missing reader id" }, { status: 400 });
  const [rows] = await db().execute(
    `SELECT w.word, w.definition, w.context, w.article_id AS articleId, a.title AS articleTitle, w.created_at AS savedAt
       FROM saved_words w LEFT JOIN articles a ON a.id = w.article_id
      WHERE w.reader_id = ? ORDER BY w.created_at DESC LIMIT 500`,
    [reader],
  );
  return NextResponse.json({ words: rows });
}

export async function POST(req: NextRequest) {
  const reader = readerId(req);
  if (!reader) return NextResponse.json({ error: "Missing reader id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { word?: string; definition?: string; context?: string; articleId?: number };
  const word = normalizeWord(body.word ?? "");
  if (!word || word.length > 64) return NextResponse.json({ error: "Invalid word" }, { status: 400 });
  await db().execute(
    `INSERT INTO saved_words (reader_id, word, definition, context, article_id) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE definition = VALUES(definition), context = VALUES(context), article_id = VALUES(article_id)`,
    [reader, word, body.definition?.slice(0, 600) ?? null, body.context?.slice(0, 600) ?? null,
      Number.isInteger(body.articleId) ? body.articleId! : null],
  );
  return NextResponse.json({ ok: true, word });
}

export async function DELETE(req: NextRequest) {
  const reader = readerId(req);
  const word = normalizeWord(req.nextUrl.searchParams.get("word") ?? "");
  if (!reader || !word) return NextResponse.json({ error: "Missing reader id or word" }, { status: 400 });
  await db().execute("DELETE FROM saved_words WHERE reader_id = ? AND word = ?", [reader, word]);
  return NextResponse.json({ ok: true });
}
