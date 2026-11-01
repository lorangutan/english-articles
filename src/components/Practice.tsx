"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NotebookWord } from "@/app/api/words/route";
import { readerId } from "@/lib/preferences";
import { sayWord } from "@/lib/use-read-aloud";

const headers = () => ({ "Content-Type": "application/json", "X-Reader-Id": readerId() });
const QUIZ_LENGTH = 10;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Weakest words first: most quiz misses, then most look-ups. */
function byWeakness(a: NotebookWord, b: NotebookWord) {
  return b.quizWrong - b.quizRight - (a.quizWrong - a.quizRight) || b.lookups - a.lookups;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordPattern = (word: string) => new RegExp(`\\b${escape(word)}\\b`, "gi");

// --- Flashcards ---------------------------------------------------------------

function Flashcards({ deck, onQuiz }: { deck: NotebookWord[]; onQuiz: () => void }) {
  const [order, setOrder] = useState(deck);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = order[i];

  const go = useCallback((step: number) => {
    setFlipped(false);
    setI((n) => Math.min(Math.max(n + step, 0), order.length - 1));
  }, [order.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const last = i === order.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Card {i + 1} of {order.length}</p>
        <button onClick={() => { setOrder(shuffle(deck)); setI(0); setFlipped(false); }} className="btn-quiet">Shuffle</button>
      </div>
      <div className="mt-4 h-px bg-rule">
        <div className="h-px bg-gold transition-all duration-500" style={{ width: `${((i + 1) / order.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show word" : "Reveal meaning"}
        className="mt-10 flex min-h-[22rem] w-full flex-col items-center justify-center border hairline bg-paper px-8 py-12 text-center transition-colors hover:border-ink"
      >
        {!flipped ? (
          <>
            <span className="display text-5xl sm:text-6xl">{card.word}</span>
            <span className="mt-8 text-[0.68rem] uppercase tracking-eyebrow text-ink-faint">Tap to reveal</span>
          </>
        ) : (
          <>
            <span className="eyebrow">{card.word}</span>
            <span className="mt-6 max-w-md font-serif text-2xl leading-snug">{card.definition ?? "No definition saved."}</span>
            {card.context && (
              <span className="mt-6 max-w-md text-sm font-light italic leading-relaxed text-ink-soft">
                &ldquo;
                {card.context.split(wordPattern(card.word)).map((part, k, arr) => (
                  <span key={k}>
                    {part}
                    {k < arr.length - 1 && <span className="not-italic text-gold-deep underline decoration-gold underline-offset-4">{card.context!.match(wordPattern(card.word))?.[0] ?? card.word}</span>}
                  </span>
                ))}
                &rdquo;
              </span>
            )}
          </>
        )}
      </button>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => go(-1)} disabled={i === 0} className="btn-quiet disabled:opacity-30">← Previous</button>
        <button onClick={() => sayWord(card.word)} className="text-[0.68rem] uppercase tracking-eyebrow text-gold-deep hover:text-ink">▸ Listen</button>
        {last ? (
          <button onClick={onQuiz} className="btn px-5 py-2.5">Take the quiz →</button>
        ) : (
          <button onClick={() => go(1)} className="btn-quiet">Next →</button>
        )}
      </div>
      <p className="mt-10 text-center text-xs font-light text-ink-faint">Space to flip · arrow keys to move</p>
    </div>
  );
}

// --- Quiz ---------------------------------------------------------------------

type Question = { word: string; kind: "gap" | "meaning"; prompt: string; options: string[]; definition: string | null };

async function buildQuiz(deck: NotebookWord[], notebook: NotebookWord[]): Promise<Question[]> {
  const picked = shuffle(deck.filter((w) => w.definition || w.context).sort(byWeakness).slice(0, QUIZ_LENGTH));
  const extra = await fetch("/api/words/distractors?n=30")
    .then((r) => (r.ok ? r.json() : { words: [] }))
    .then((d: { words: string[] }) => d.words)
    .catch(() => [] as string[]);

  return picked.map((w, n) => {
    const pattern = wordPattern(w.word);
    // Alternate between a gap-fill from the reader's own sentence and a meaning question.
    const canGap = Boolean(w.context && pattern.test(w.context));
    const kind: Question["kind"] = canGap && (n % 2 === 0 || !w.definition) ? "gap" : "meaning";
    const prompt = kind === "gap"
      ? w.context!.replace(wordPattern(w.word), "_____")
      : (w.definition ?? "").replace(wordPattern(w.word), "—");
    const pool = [...new Set([...shuffle(notebook.map((x) => x.word)), ...extra])].filter((x) => x !== w.word);
    return { word: w.word, kind, prompt, definition: w.definition, options: shuffle([w.word, ...pool.slice(0, 3)]) };
  });
}

function Quiz({ deck, notebook, onCards }: { deck: NotebookWord[]; notebook: NotebookWord[]; onCards: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [n, setN] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ q: Question; correct: boolean }[]>([]);

  const start = useCallback(() => {
    setQuestions(null);
    setN(0);
    setChosen(null);
    setAnswers([]);
    buildQuiz(deck, notebook).then(setQuestions);
  }, [deck, notebook]);

  useEffect(start, [start]);

  const q = questions?.[n];

  const answer = useCallback((option: string) => {
    if (!q || chosen) return;
    const correct = option === q.word;
    setChosen(option);
    setAnswers((a) => [...a, { q, correct }]);
    fetch("/api/words/quiz", { method: "POST", headers: headers(), body: JSON.stringify({ word: q.word, correct }) }).catch(() => {});
  }, [q, chosen]);

  const next = useCallback(() => {
    setChosen(null);
    setN((x) => x + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const idx = Number(e.key) - 1;
      if (!chosen && idx >= 0 && idx < q.options.length) answer(q.options[idx]);
      if (chosen && e.key === "Enter") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, chosen, answer, next]);

  if (!questions) return <div className="mx-auto h-72 max-w-2xl animate-pulse bg-paper" aria-busy />;

  if (!questions.length) {
    return <p className="text-center font-light text-ink-soft">These words have no saved definitions yet — look them up again while reading.</p>;
  }

  // Results
  if (!q) {
    const score = answers.filter((a) => a.correct).length;
    const missed = answers.filter((a) => !a.correct);
    const verdict = score === answers.length ? "Flawless." : score / answers.length >= 0.7 ? "Well read." : "Worth another pass.";
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Your result</p>
        <p className="display mt-6 text-7xl">{score}<span className="text-ink-faint"> / {answers.length}</span></p>
        <p className="mt-4 font-serif text-2xl italic text-ink-soft">{verdict}</p>
        {missed.length > 0 && (
          <ol className="mt-14 border-t hairline text-left">
            {missed.map(({ q }) => (
              <li key={q.word} className="border-b hairline py-5">
                <span className="font-serif text-2xl">{q.word}</span>
                {q.definition && <p className="mt-1 font-light text-ink-soft">{q.definition}</p>}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <button onClick={start} className="btn">Try again ↻</button>
          <button onClick={onCards} className="btn">Study flashcards</button>
        </div>
        <Link href="/words" className="btn-quiet mt-8 inline-block">Back to notebook</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Question {n + 1} of {questions.length}</p>
        <p className="text-sm tabular-nums text-ink-faint">{answers.filter((a) => a.correct).length} correct</p>
      </div>
      <div className="mt-4 h-px bg-rule">
        <div className="h-px bg-gold transition-all duration-500" style={{ width: `${(n / questions.length) * 100}%` }} />
      </div>

      <p className="mt-12 text-[0.68rem] uppercase tracking-eyebrow text-ink-faint">
        {q.kind === "gap" ? "Which word completes the sentence?" : "Which word has this meaning?"}
      </p>
      <p className={`mt-4 font-serif leading-snug ${q.kind === "gap" ? "text-2xl italic sm:text-3xl" : "text-2xl sm:text-3xl"}`}>
        {q.kind === "gap" ? <>&ldquo;{q.prompt}&rdquo;</> : q.prompt}
      </p>

      <ol className="mt-10 grid gap-3 sm:grid-cols-2">
        {q.options.map((option, k) => {
          const isAnswer = option === q.word;
          const state = !chosen ? "idle" : isAnswer ? "right" : option === chosen ? "wrong" : "muted";
          return (
            <li key={option}>
              <button
                onClick={() => answer(option)}
                disabled={Boolean(chosen)}
                className={`flex w-full items-baseline gap-4 border px-5 py-4 text-left transition-colors ${
                  state === "idle" ? "hairline hover:border-ink" :
                  state === "right" ? "border-gold bg-gold-wash" :
                  state === "wrong" ? "border-ink text-ink-faint line-through" : "hairline text-ink-faint"
                }`}
              >
                <span className="text-xs tabular-nums text-ink-faint">{k + 1}</span>
                <span className="font-serif text-xl">{option}</span>
                {state === "right" && <span className="ml-auto text-gold-deep">✓</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex min-h-[3rem] items-center justify-between gap-4">
        {chosen ? (
          <>
            <p className="font-light text-ink-soft">
              {chosen === q.word ? "Correct." : <>The answer is <span className="font-serif text-lg text-ink">{q.word}</span>.</>}
            </p>
            <button onClick={next} className="btn px-5 py-2.5">{n + 1 === questions.length ? "See results" : "Next →"}</button>
          </>
        ) : (
          <p className="text-xs font-light text-ink-faint">Press 1–{q.options.length} to answer.</p>
        )}
      </div>
    </div>
  );
}

// --- Page ---------------------------------------------------------------------

export default function Practice() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") === "quiz" ? "quiz" : "cards";
  const [notebook, setNotebook] = useState<NotebookWord[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/words", { headers: headers() })
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d: { words: NotebookWord[] }) => setNotebook(d.words))
      .catch(() => setNotebook([]));
  }, []);

  useEffect(load, [load]);

  const deck = useMemo(() => (notebook ?? []).filter((w) => w.inDeck).sort(byWeakness), [notebook]);
  const setMode = (m: "cards" | "quiz") => router.replace(m === "quiz" ? "/practice?mode=quiz" : "/practice", { scroll: false });

  const useAll = async () => {
    if (!notebook?.length) return;
    await fetch("/api/words", { method: "PATCH", headers: headers(), body: JSON.stringify({ words: notebook.map((w) => w.word), inDeck: true }) }).catch(() => {});
    load();
  };

  return (
    <main className="mx-auto max-w-5xl px-6 pt-16 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Practice</p>
          <h1 className="display mt-5 text-5xl sm:text-6xl">{mode === "quiz" ? "A short quiz" : "Flashcards"}</h1>
        </div>
        <div role="tablist" className="flex border hairline">
          {(["cards", "quiz"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-5 py-2 text-[0.68rem] uppercase tracking-eyebrow transition-colors ${mode === m ? "bg-ink text-ivory" : "text-ink-soft hover:text-ink"}`}
            >
              {m === "cards" ? "Flashcards" : "Quiz"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-10 border-t hairline pt-14">
        {notebook === null ? (
          <div className="mx-auto h-72 max-w-2xl animate-pulse bg-paper" aria-busy />
        ) : !deck.length ? (
          <div className="py-10 text-center">
            <p className="font-serif text-2xl text-ink-soft">Your flashcard deck is empty.</p>
            {notebook.length ? (
              <>
                <p className="mt-3 font-light text-ink-faint">You have {notebook.length} {notebook.length === 1 ? "word" : "words"} in your notebook.</p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <button onClick={useAll} className="btn">Use all {notebook.length} words</button>
                  <Link href="/words" className="btn">Choose in notebook</Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 font-light text-ink-faint">Tap words while reading; they will collect in your notebook.</p>
                <Link href="/read" className="btn mt-10">Open the library →</Link>
              </>
            )}
          </div>
        ) : mode === "cards" ? (
          <Flashcards key={deck.map((w) => w.word).join()} deck={deck} onQuiz={() => setMode("quiz")} />
        ) : (
          <Quiz deck={deck} notebook={notebook} onCards={() => setMode("cards")} />
        )}
      </div>
    </main>
  );
}
