"use client";

// Per-browser conveniences: the reader's chosen level, interests and anonymous id.
// Storage can be unavailable (private windows, blocked site data), so every access is guarded.

export type Preferences = { band: number; topics: string[]; scale: "cefr" | "ielts" | "toefl" };

const PREFS_KEY = "folio.preferences";
const READER_KEY = "folio.reader";

export function loadPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Preferences) : null;
  } catch {
    return null;
  }
}

export function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

let fallbackReader: string | null = null;

export function readerId() {
  try {
    let id = localStorage.getItem(READER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(READER_KEY, id);
    }
    return id;
  } catch {
    fallbackReader ??= crypto.randomUUID();
    return fallbackReader;
  }
}
