"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NotebookWord } from "@/app/api/words/route";
import { readerId } from "@/lib/preferences";

type Sort = "lookups" | "recent" | "alpha";

const SORTS: { id: Sort; label: string }[] = [
  { id: "lookups", label: "Most looked up" },
  { id: "recent", label: "Recent" },
  { id: "alpha", label: "A – Z" },
];

const headers = () => ({ "Content-Type": "application/json", "X-Reader-Id": readerId() });

function Mastery({ w }: { w: NotebookWord }) {
  const total = w.quizRight + w.quizWrong;
  if (!total) return null;
  return (
    <span className="text-ink-faint">
      <span className="mx-2.5">·</span>quiz {w.quizRight}/{total}
    </span>
  );
}

export default function WordList() {
  const [words, setWords] = useState<NotebookWord[] | null>(null);
  const [sort, setSort] = useState<Sort>("lookups");

  useEffect(() => {
    fetch("/api/words", { headers: headers() })
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d: { words: NotebookWord[] }) => setWords(d.words))
      .catch(() => setWords([]));
  }, []);

  const sorted = useMemo(() => {
    const list = [...(words ?? [])];
    if (sort === "lookups") list.sort((a, b) => b.lookups - a.lookups || b.lastSeenAt.localeCompare(a.lastSeenAt));
    if (sort === "recent") list.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    if (sort === "alpha") list.sort((a, b) => a.word.localeCompare(b.word));
    return list;
  }, [words, sort]);

  const setDeck = async (targets: string[], inDeck: boolean) => {
    setWords((ws) => ws?.map((w) => (targets.includes(w.word) ? { ...w, inDeck } : w)) ?? null);
    await fetch("/api/words", { method: "PATCH", headers: headers(), body: JSON.stringify({ words: targets, inDeck }) }).catch(() => {});
  };

  const remove = async (word: string) => {
    setWords((ws) => ws?.filter((x) => x.word !== word) ?? null);
    await fetch(`/api/words?word=${encodeURIComponent(word)}`, { method: "DELETE", headers: headers() }).catch(() => {});
  };

  if (words === null) return <div className="mt-14 h-40 animate-pulse bg-paper" aria-busy />;

  if (!words.length) {
    return (
      <div className="mt-20 text-center">
        <p className="font-serif text-2xl text-ink-soft">Your notebook is still blank.</p>
        <p className="mt-3 font-light text-ink-faint">Tap any word while reading — it will be noted here automatically.</p>
        <Link href="/read" className="btn mt-10">Open the library →</Link>
      </div>
    );
  }

  const deck = words.filter((w) => w.inDeck);
  const lookups = words.reduce((n, w) => n + w.lookups, 0);
  const frequent = words.filter((w) => w.lookups >= 2).map((w) => w.word);

  return (
    <>
      {/* Summary */}
      <dl className="mt-12 grid grid-cols-3 border-y hairline">
        {[
          ["Words noted", words.length],
          ["Look-ups", lookups],
          ["In flashcards", deck.length],
        ].map(([label, n], i) => (
          <div key={label} className={`py-6 ${i ? "border-l hairline pl-5 sm:pl-8" : ""}`}>
            <dt className="eyebrow text-ink-faint">{label}</dt>
            <dd className="mt-2 font-serif text-4xl">{n}</dd>
          </div>
        ))}
      </dl>

      {/* Practice */}
      <section className="mt-10 bg-paper px-6 py-8 sm:px-8">
        <p className="eyebrow">Practice</p>
        <p className="mt-3 max-w-xl font-light leading-relaxed text-ink-soft">
          {deck.length
            ? `${deck.length} ${deck.length === 1 ? "word is" : "words are"} in your flashcard deck. Study them, then test yourself.`
            : "Choose words for your flashcard deck below — or add them all at once."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {deck.length ? (
            <>
              <Link href="/practice" className="btn">Study flashcards →</Link>
              <Link href="/practice?mode=quiz" className="btn">Take the quiz →</Link>
            </>
          ) : (
            <button onClick={() => setDeck(words.map((w) => w.word), true)} className="btn">Make flashcards from all {words.length}</button>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {deck.length < words.length && deck.length > 0 && (
            <button onClick={() => setDeck(words.map((w) => w.word), true)} className="btn-quiet">Add all</button>
          )}
          {frequent.length > 0 && (
            <button onClick={() => setDeck(frequent, true)} className="btn-quiet">Add words looked up 2+ times ({frequent.length})</button>
          )}
          {deck.length > 0 && (
            <button onClick={() => setDeck(deck.map((w) => w.word), false)} className="btn-quiet">Clear deck</button>
          )}
        </div>
      </section>

      {/* Sort */}
      <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="eyebrow text-ink-faint">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={sort === s.id ? "text-ink underline decoration-gold underline-offset-[6px]" : "text-ink-faint hover:text-ink"}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ol className="mt-6 border-t hairline">
        {sorted.map((w) => (
          <li key={w.word} className="grid grid-cols-[1.75rem_1fr] gap-x-4 gap-y-3 border-b hairline py-8 sm:grid-cols-[1.75rem_13rem_1fr_auto] sm:gap-x-8">
            <button
              onClick={() => setDeck([w.word], !w.inDeck)}
              role="checkbox"
              aria-checked={w.inDeck}
              aria-label={`${w.inDeck ? "Remove" : "Add"} ${w.word} ${w.inDeck ? "from" : "to"} flashcards`}
              title={w.inDeck ? "In flashcards" : "Add to flashcards"}
              className={`mt-3 flex h-5 w-5 items-center justify-center border text-[0.7rem] transition-colors ${
                w.inDeck ? "border-ink bg-ink text-ivory" : "border-rule hover:border-ink"
              }`}
            >
              {w.inDeck ? "✓" : ""}
            </button>
            <div>
              <h2 className="font-serif text-3xl">{w.word}</h2>
              <p className="mt-1 text-[0.68rem] uppercase tracking-eyebrow text-gold-deep">
                Looked up {w.lookups}×<Mastery w={w} />
              </p>
            </div>
            <div className="col-start-2 sm:col-start-auto">
              {w.definition && <p className="font-light leading-relaxed">{w.definition}</p>}
              {w.context && <p className="mt-3 font-serif italic leading-relaxed text-ink-soft">&ldquo;{w.context}&rdquo;</p>}
              {w.articleId && w.articleTitle && (
                <Link href={`/article/${w.articleId}`} className="mt-3 inline-block text-[0.68rem] uppercase tracking-eyebrow text-ink-faint hover:text-ink">
                  From: {w.articleTitle}
                </Link>
              )}
            </div>
            <button onClick={() => remove(w.word)} className="btn-quiet col-start-2 justify-self-start self-start sm:col-start-auto">Remove</button>
          </li>
        ))}
      </ol>
    </>
  );
}
