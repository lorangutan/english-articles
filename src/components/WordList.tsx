"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readerId } from "@/lib/preferences";

type SavedWord = {
  word: string;
  definition: string | null;
  context: string | null;
  articleId: number | null;
  articleTitle: string | null;
};

export default function WordList() {
  const [words, setWords] = useState<SavedWord[] | null>(null);

  useEffect(() => {
    fetch("/api/words", { headers: { "X-Reader-Id": readerId() } })
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d: { words: SavedWord[] }) => setWords(d.words))
      .catch(() => setWords([]));
  }, []);

  const remove = async (word: string) => {
    setWords((w) => w?.filter((x) => x.word !== word) ?? null);
    await fetch(`/api/words?word=${encodeURIComponent(word)}`, { method: "DELETE", headers: { "X-Reader-Id": readerId() } }).catch(() => {});
  };

  if (words === null) return <div className="mt-14 h-40 animate-pulse bg-paper" aria-busy />;

  if (!words.length) {
    return (
      <div className="mt-20 text-center">
        <p className="font-serif text-2xl text-ink-soft">Your list is still blank.</p>
        <p className="mt-3 font-light text-ink-faint">Tap a word while reading, then choose &ldquo;Keep this word&rdquo;.</p>
        <Link href="/read" className="btn mt-10">Open the library →</Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm font-light text-ink-soft">{words.length} {words.length === 1 ? "word" : "words"} kept on this device.</p>
      <ol className="mt-12 border-t hairline">
        {words.map((w) => (
          <li key={w.word} className="grid gap-3 border-b hairline py-8 sm:grid-cols-[14rem_1fr_auto] sm:gap-10">
            <h2 className="font-serif text-3xl">{w.word}</h2>
            <div>
              {w.definition && <p className="font-light leading-relaxed">{w.definition}</p>}
              {w.context && <p className="mt-3 font-serif italic leading-relaxed text-ink-soft">&ldquo;{w.context}&rdquo;</p>}
              {w.articleId && w.articleTitle && (
                <Link href={`/article/${w.articleId}`} className="mt-3 inline-block text-[0.68rem] uppercase tracking-eyebrow text-gold-deep hover:text-ink">
                  From: {w.articleTitle}
                </Link>
              )}
            </div>
            <button onClick={() => remove(w.word)} className="btn-quiet self-start justify-self-start">Remove</button>
          </li>
        ))}
      </ol>
    </>
  );
}
