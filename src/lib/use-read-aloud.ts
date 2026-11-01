"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Read-aloud on the browser's built-in Web Speech API: free, keyless and offline-capable.
// Text is spoken one sentence at a time, which keeps long articles clear of Chrome's
// cut-off on long utterances, and lets pause/resume work by re-speaking the current sentence
// (speechSynthesis.pause() is unreliable on Android).

type Item = { block: number; offset: number; text: string };
export type Position = { block: number; char: number };
export type Status = "idle" | "playing" | "paused";

const VOICE_KEY = "folio.voice";
const RATE_KEY = "folio.rate";

export const RATES = [0.75, 0.9, 1, 1.15];

/** Strips the "## " / "^^ " markers our article bodies use. */
export function blockText(block: string) {
  return block.replace(/^(## |\^\^ )/, "");
}

function sentences(text: string) {
  return [...text.matchAll(/[^.!?]+(?:[.!?]+["'”’)]*|$)\s*/g)]
    .filter((m) => m[0].trim())
    .map((m) => ({ offset: m.index ?? 0, text: m[0] }));
}

/** Natural-sounding voices first: Edge "Online (Natural)", then Google, then Apple's best. */
function voiceScore(v: SpeechSynthesisVoice) {
  let s = 0;
  if (/natural|online/i.test(v.name)) s += 40;
  if (/google/i.test(v.name)) s += 25;
  if (/samantha|daniel|karen|moira|serena|ava|allison/i.test(v.name)) s += 20;
  if (/^en[-_](US|GB)/i.test(v.lang)) s += 10;
  if (v.localService) s += 1;
  return s;
}

export function voiceLabel(v: SpeechSynthesisVoice) {
  const name = v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s*[-–(].*$/, "");
  return `${name || v.name} · ${v.lang.replace("_", "-")}`;
}

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function useReadAloud(blocks: string[]) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [rate, setRateState] = useState(0.9);
  const [status, setStatus] = useState<Status>("idle");
  const [position, setPosition] = useState<Position | null>(null);

  const index = useRef(0);
  const generation = useRef(0); // bumps on every cancel so stale onend callbacks are ignored
  const settings = useRef<{ voice: SpeechSynthesisVoice | null; rate: number }>({ voice: null, rate: 0.9 });

  const queue = useMemo<Item[]>(
    () =>
      blocks.flatMap((b, block) =>
        b.startsWith("^^ ") ? [] : sentences(blockText(b)).map((s) => ({ block, offset: s.offset, text: s.text })),
      ),
    [blocks],
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setSupported(true);
    const savedRate = Number(stored(RATE_KEY));
    if (RATES.includes(savedRate)) setRateState(savedRate);

    const load = () => {
      const english = speechSynthesis
        .getVoices()
        .filter((v) => /^en([-_]|$)/i.test(v.lang))
        .sort((a, b) => voiceScore(b) - voiceScore(a));
      setVoices(english);
      setVoiceName((current) => {
        if (current && english.some((v) => v.name === current)) return current;
        const saved = stored(VOICE_KEY);
        return english.find((v) => v.name === saved)?.name ?? english[0]?.name ?? null;
      });
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      generation.current++;
      speechSynthesis.cancel();
    };
  }, []);

  settings.current = { voice: voices.find((v) => v.name === voiceName) ?? null, rate };

  const speakAt = useCallback(
    (i: number) => {
      const item = queue[i];
      if (!item) {
        setStatus("idle");
        setPosition(null);
        index.current = 0;
        return;
      }
      index.current = i;
      const gen = generation.current;
      const u = new SpeechSynthesisUtterance(item.text);
      const { voice, rate } = settings.current;
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.rate = rate;
      u.onstart = () => gen === generation.current && setPosition({ block: item.block, char: item.offset });
      u.onboundary = (e) => {
        if (gen === generation.current && (e.name === "word" || !e.name)) {
          setPosition({ block: item.block, char: item.offset + e.charIndex });
        }
      };
      u.onend = () => gen === generation.current && speakAt(i + 1);
      u.onerror = (e) => {
        if (gen !== generation.current || e.error === "interrupted" || e.error === "canceled") return;
        setStatus("idle");
      };
      speechSynthesis.speak(u);
    },
    [queue],
  );

  const restart = useCallback(
    (i: number) => {
      generation.current++;
      speechSynthesis.cancel();
      setStatus("playing");
      speakAt(i);
    },
    [speakAt],
  );

  const play = useCallback(() => restart(status === "paused" ? index.current : 0), [restart, status]);

  /** Starts reading at the sentence containing this character of a block. */
  const playFrom = useCallback(
    (block: number, char: number) => {
      let i = queue.findIndex((q) => q.block === block);
      if (i < 0) return;
      while (queue[i + 1]?.block === block && queue[i + 1].offset <= char) i++;
      restart(i);
    },
    [queue, restart],
  );

  const pause = useCallback(() => {
    generation.current++;
    speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    generation.current++;
    speechSynthesis.cancel();
    setStatus("idle");
    setPosition(null);
    index.current = 0;
  }, []);

  // Changing voice or speed mid-sentence restarts that sentence with the new setting.
  const setVoice = (name: string) => {
    setVoiceName(name);
    store(VOICE_KEY, name);
    settings.current.voice = voices.find((v) => v.name === name) ?? null;
    if (status === "playing") restart(index.current);
  };

  const setRate = (r: number) => {
    setRateState(r);
    store(RATE_KEY, String(r));
    settings.current.rate = r;
    if (status === "playing") restart(index.current);
  };

  /** Pronounces a single word (used when the dictionary has no recording). */
  const speakWord = (word: string) => {
    if (!supported) return;
    if (status === "playing") pause();
    const u = new SpeechSynthesisUtterance(word);
    const { voice } = settings.current;
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "en-US";
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  return { supported, voices, voiceName, setVoice, rate, setRate, status, position, play, playFrom, pause, stop, speakWord };
}

/** One-off pronunciation outside the reader (flashcards), in the reader's saved voice. */
export function sayWord(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  const voice = speechSynthesis.getVoices().find((v) => v.name === stored(VOICE_KEY));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-US";
  u.rate = 0.85;
  speechSynthesis.speak(u);
}
