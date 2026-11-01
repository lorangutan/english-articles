"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Definition } from "@/lib/dictionary";
import { readerId } from "@/lib/preferences";
import { RATES, blockText, useReadAloud, voiceLabel } from "@/lib/use-read-aloud";

type Active = { word: string; key: string; context: string; block: number; offset: number };
type NoteState = { lookups: number; inDeck: boolean };
type Lookup ={ state: "loading" } | { state: "missing" } | { state: "error" } | { state: "ok"; def: Definition };

const WORD = /([A-Za-z]+(?:['’][A-Za-z]+)?)/;

function sentenceAround(text: string, word: string) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  return (sentences.find((s) => s.includes(word)) ?? text).trim().slice(0, 600);
}

type ParagraphProps = { text: string; index: number; activeKey: string | null; readingChar: number | null };

// Memoised so a read-aloud tick only re-renders the paragraph being spoken.
const Paragraph = memo(function Paragraph({ text, index, activeKey, readingChar }: ParagraphProps) {
  // Odd entries are words; even entries are the spaces and punctuation between them.
  const parts = useMemo(() => {
    let offset = 0;
    return text.split(WORD).map((part) => {
      const start = offset;
      offset += part.length;
      return { part, start };
    });
  }, [text]);
  return (
    <>
      {parts.map(({ part, start }, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const key = `${index}:${i}`;
        const reading = readingChar !== null && readingChar >= start && readingChar < start + part.length;
        const cls = key === activeKey ? "word word-active" : reading ? "word word-reading" : "word";
        return (
          <span key={i} data-key={key} data-block={index} data-offset={start} className={cls}>
            {part}
          </span>
        );
      })}
    </>
  );
});

function Player({ speech }: { speech: ReturnType<typeof useReadAloud> }) {
  if (!speech.supported) return null;
  const { status, voices, voiceName, rate } = speech;
  return (
    <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b hairline bg-ivory px-6 py-3 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-4">
        <button
          onClick={status === "playing" ? speech.pause : speech.play}
          className="inline-flex min-w-[7.5rem] items-center gap-2.5 border border-ink px-4 py-2 text-[0.7rem] uppercase tracking-eyebrow transition-colors hover:bg-ink hover:text-ivory"
        >
          <span aria-hidden className="w-3 text-center">{status === "playing" ? "❚❚" : "▶"}</span>
          {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Listen"}
        </button>
        {status !== "idle" && (
          <button onClick={speech.stop} className="btn-quiet">Stop</button>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm" role="radiogroup" aria-label="Reading speed">
        {RATES.map((r) => (
          <button
            key={r}
            role="radio"
            aria-checked={rate === r}
            onClick={() => speech.setRate(r)}
            className={`tabular-nums transition-colors ${rate === r ? "text-ink underline decoration-gold underline-offset-[6px]" : "text-ink-faint hover:text-ink"}`}
          >
            {r}×
          </button>
        ))}
      </div>

      {voices.length > 1 && (
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:justify-end">
          <span className="sr-only">Voice</span>
          <select
            value={voiceName ?? ""}
            onChange={(e) => speech.setVoice(e.target.value)}
            className="w-full min-w-0 max-w-[16rem] cursor-pointer truncate border-0 border-b hairline bg-transparent py-1 pr-6 font-light text-ink-soft focus:outline-none sm:w-auto"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{voiceLabel(v)}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export default function Reader({ blocks, articleId }: { blocks: string[]; articleId: number }) {
  const [active, setActive] = useState<Active | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [notebook, setNotebook] = useState<Map<string, NoteState>>(new Map());
  const speech = useReadAloud(blocks);

  useEffect(() => {
    fetch("/api/words", { headers: { "X-Reader-Id": readerId() } })
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d: { words: (NoteState & { word: string })[] }) =>
        setNotebook(new Map(d.words.map((w) => [w.word, { lookups: w.lookups, inDeck: w.inDeck }]))),
      )
      .catch(() => {});
  }, []);

  const note = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Reader-Id": readerId() },
      body: JSON.stringify({ ...payload, articleId }),
    }).catch(() => null);
    if (!res?.ok) return;
    const saved = (await res.json()) as NoteState & { word: string };
    setNotebook((m) => new Map(m).set(saved.word, { lookups: saved.lookups, inDeck: saved.inDeck }));
  }, [articleId]);

  const close = useCallback(() => {
    setActive(null);
    setLookup(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const onTap = async (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (!el) return;
    const word = el.textContent ?? "";
    const key = el.dataset.key!;
    if (active?.key === key) return close();
    const block = Number(el.dataset.block);
    const context = sentenceAround(blockText(blocks[block]), word);
    setActive({ word, key, context, block, offset: Number(el.dataset.offset) });
    setLookup({ state: "loading" });
    try {
      const res = await fetch(`/api/define?word=${encodeURIComponent(word)}`);
      if (res.status === 404) return setLookup({ state: "missing" });
      if (!res.ok) throw new Error();
      const def = (await res.json()) as Definition;
      setLookup({ state: "ok", def });
      // Every successful lookup goes into the reader's notebook and bumps its count.
      note({ word: def.word, definition: def.meanings[0]?.definitions[0]?.definition, context, lookup: true });
    } catch {
      setLookup({ state: "error" });
    }
  };

  const toggleDeck = (word: string) => {
    const inDeck = !notebook.get(word)?.inDeck;
    setNotebook((m) => new Map(m).set(word, { lookups: m.get(word)?.lookups ?? 1, inDeck }));
    note({ word, inDeck });
  };

  const readingChar = (i: number) => (speech.position?.block === i ? speech.position.char : null);

  const pronounce = (word: string, audio: string | null) => {
    if (audio) new Audio(audio).play().catch(() => speech.speakWord(word));
    else speech.speakWord(word);
  };

  return (
    <>
      <Player speech={speech} />

      <div onClick={onTap} className="article-body">
        {blocks.map((block, i) => {
          if (block.startsWith("## ")) {
            return <h2 key={i} className="mt-14 font-serif text-2xl leading-snug sm:text-[1.7rem]"><Paragraph text={block.slice(3)} index={i} activeKey={active?.key ?? null} readingChar={readingChar(i)} /></h2>;
          }
          if (block.startsWith("^^ ")) {
            return <p key={i} className="mt-6 text-xs italic leading-relaxed text-ink-faint">{block.slice(3)}</p>;
          }
          return (
            <p key={i} className={`mt-7 text-[1.13rem] font-light leading-[1.85] text-ink ${i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[4.2rem] first-letter:leading-[0.85] first-letter:text-gold-deep" : ""}`}>
              <Paragraph text={block} index={i} activeKey={active?.key ?? null} readingChar={readingChar(i)} />
            </p>
          );
        })}
      </div>

      {active && lookup && (
        <aside
          role="dialog"
          aria-label={`Definition of ${active.word}`}
          className="fixed inset-x-0 bottom-0 z-20 max-h-[60vh] overflow-y-auto border-t border-ink bg-paper px-6 pb-8 pt-6 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:w-[24rem] sm:border"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Definition</p>
              <h3 className="mt-2 font-serif text-4xl">{lookup.state === "ok" ? lookup.def.word : active.word.toLowerCase()}</h3>
              {(() => {
                const def = lookup.state === "ok" ? lookup.def : null;
                const audio = def?.audio ?? null;
                if (!def?.phonetic && !audio && !speech.supported) return null;
                return (
                  <p className="mt-2 flex items-center gap-3 text-sm text-ink-soft">
                    {def?.phonetic}
                    {(audio || speech.supported) && (
                      <button
                        onClick={() => pronounce(def?.word ?? active.word, audio)}
                        className="text-[0.68rem] uppercase tracking-eyebrow text-gold-deep hover:text-ink"
                      >
                        ▸ Listen
                      </button>
                    )}
                  </p>
                );
              })()}
            </div>
            <button onClick={close} aria-label="Close" className="text-xl leading-none text-ink-faint hover:text-ink">×</button>
          </div>

          {lookup.state === "ok" && (() => {
            const entry = notebook.get(lookup.def.word);
            return (
              <div className="mt-5">
                <p className="text-xs font-light text-ink-faint">
                  {entry ? <>In your notebook · looked up <span className="text-ink">{entry.lookups}×</span></> : "Adding to your notebook…"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => toggleDeck(lookup.def.word)}
                    aria-pressed={Boolean(entry?.inDeck)}
                    className={`btn px-5 py-2.5 ${entry?.inDeck ? "bg-ink text-ivory" : ""}`}
                  >
                    {entry?.inDeck ? "✓ In flashcards" : "+ Flashcards"}
                  </button>
                  <span className="flex gap-5">
                    {speech.supported && (
                      <button onClick={() => { speech.playFrom(active.block, active.offset); close(); }} className="btn-quiet">
                        Read from here
                      </button>
                    )}
                    <a href="/words" className="btn-quiet">Notebook</a>
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="mt-5 border-t hairline pt-5 text-[0.95rem] leading-relaxed">
            {lookup.state === "loading" && <p className="font-light text-ink-faint">Looking it up…</p>}
            {lookup.state === "missing" && <p className="font-light text-ink-soft">No dictionary entry for this word — it may be a name or a rare form.</p>}
            {lookup.state === "error" && <p className="font-light text-ink-soft">The dictionary is unavailable just now. Please try again.</p>}
            {lookup.state === "ok" && (
              <ol className="space-y-5">
                {lookup.def.meanings.map((m) => (
                  <li key={m.partOfSpeech}>
                    <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-faint">{m.partOfSpeech}</p>
                    <ol className="mt-2 space-y-2.5">
                      {m.definitions.slice(0, 2).map((d, i) => (
                        <li key={i} className="font-light">
                          {d.definition}
                          {d.example && <span className="mt-1 block font-serif italic text-ink-soft">&ldquo;{d.example}&rdquo;</span>}
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
