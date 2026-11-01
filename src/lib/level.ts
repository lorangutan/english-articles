import { COMMON_WORDS } from "./common-words";
import { cefrToBand } from "./levels";

// Readability estimate for an English text, mapped onto CEFR.
//
//   difficulty = Flesch–Kincaid grade + 12 × (share of lowercase words outside the core list)
//
// Flesch–Kincaid captures sentence length and word length (syllables); the rare-word share
// captures vocabulary load. Thresholds were calibrated against Simple English Wikipedia
// (A2–B1) and The Conversation (B2–C2). It is an estimate, not a test.

const CEFR_THRESHOLDS: [number, string][] = [
  [9, "A1"],
  [11, "A2"],
  [13.5, "B1"],
  [16.5, "B2"],
  [19.5, "C1"],
];

export function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Crude base form so "studies", "walked" and "running" count as common words. */
export function baseForm(word: string) {
  const w = word.toLowerCase();
  if (COMMON_WORDS.has(w)) return w;
  const candidates = [
    w.replace(/ies$/, "y"),
    w.replace(/es$/, ""),
    w.replace(/s$/, ""),
    w.replace(/ied$/, "y"),
    w.replace(/ed$/, ""),
    w.replace(/ed$/, "e"),
    w.replace(/(.)\1ed$/, "$1"),
    w.replace(/ing$/, ""),
    w.replace(/ing$/, "e"),
    w.replace(/(.)\1ing$/, "$1"),
    w.replace(/ly$/, ""),
    w.replace(/er$/, ""),
    w.replace(/est$/, ""),
  ];
  return candidates.find((c) => COMMON_WORDS.has(c)) ?? w;
}

export type LevelEstimate = {
  difficulty: number;
  cefr: string;
  band: 1 | 2 | 3 | 4;
  words: number;
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Lowest level a source can be shelved at: essays by academics are never beginner reading. */
export const SOURCE_FLOOR: Record<string, string> = { conversation: "B1" };

export function estimateLevel(text: string, floor = "A1"): LevelEstimate {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter((s) => /[a-z]/i.test(s));
  // Unicode-aware so "Alfréd" stays one word; digits-and-unit tokens like "500m" are skipped.
  const words = (text.match(/(?<![\p{L}\d])\p{L}[\p{L}'’-]*/gu) ?? []).map((w) => w.replace(/['’]s$/, ""));
  const wordCount = Math.max(1, words.length);
  const sentenceCount = Math.max(1, sentences.length);

  const syllableCount = words.reduce((n, w) => n + syllables(w), 0);
  const fkGrade = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;

  // Capitalised words are mostly names, so "Giza" doesn't count as rare vocabulary.
  const lowerWords = words.filter((w) => w.length > 1 && w[0] === w[0].toLowerCase());
  const rare = lowerWords.filter((w) => !COMMON_WORDS.has(baseForm(w.replace(/['’].*$/, "")))).length;
  const rareShare = lowerWords.length ? rare / lowerWords.length : 0;

  const difficulty = Math.max(0, fkGrade + rareShare * 12);
  const estimated = CEFR_THRESHOLDS.find(([max]) => difficulty < max)?.[1] ?? "C2";
  const cefr = CEFR_ORDER.indexOf(estimated) < CEFR_ORDER.indexOf(floor) ? floor : estimated;
  return { difficulty: Math.round(difficulty * 100) / 100, cefr, band: cefrToBand(cefr), words: words.length };
}
