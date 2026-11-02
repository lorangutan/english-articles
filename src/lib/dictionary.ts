import { db } from "./db";

// Definitions come from the Free Dictionary API (dictionaryapi.dev, no key), which also gives
// phonetics and audio. It has gaps (it 404s on words as common as "swim"), so Wiktionary's REST
// definitions fill in. Every lookup, including "not found", is cached in word_cache.

export type Definition = {
  word: string;
  phonetic: string | null;
  audio: string | null;
  meanings: { partOfSpeech: string; definitions: { definition: string; example: string | null }[] }[];
  /** Set when the tapped word is an inflection, e.g. "doctors · plural of doctor". */
  formOf?: string;
};

type ApiEntry = {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
};

export function normalizeWord(input: string) {
  return input.toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, "").replace(/'s$/, "");
}

/** Forms to try when the exact word has no entry: "studies" → "study", "walked" → "walk". */
function fallbacks(w: string) {
  const forms = [
    w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
    w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/(.)\1ed$/, "$1"),
    w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/(.)\1ing$/, "$1"),
    w.replace(/ly$/, ""), w.replace(/ier$/, "y"), w.replace(/iest$/, "y"),
  ];
  return [...new Set(forms)].filter((f) => f !== w && f.length > 1);
}

function shape(entries: ApiEntry[]): Definition {
  const first = entries[0];
  const phonetics = entries.flatMap((e) => e.phonetics ?? []);
  const byPos = new Map<string, { definition: string; example: string | null }[]>();
  for (const m of entries.flatMap((e) => e.meanings ?? [])) {
    const list = byPos.get(m.partOfSpeech) ?? [];
    list.push(...m.definitions.map((d) => ({ definition: d.definition, example: d.example ?? null })));
    byPos.set(m.partOfSpeech, list);
  }
  return {
    word: first.word,
    phonetic: first.phonetic ?? phonetics.find((p) => p.text)?.text ?? null,
    audio: phonetics.find((p) => p.audio)?.audio || null,
    meanings: [...byPos].slice(0, 3).map(([partOfSpeech, defs]) => ({ partOfSpeech, definitions: defs.slice(0, 3) })),
  };
}

async function fetchFreeDictionary(word: string): Promise<Definition | null> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return shape((await res.json()) as ApiEntry[]);
}

type WiktionarySense = { definition: string; examples?: string[]; parsedExamples?: { example: string }[] };
type WiktionaryEntry = { partOfSpeech: string; language: string; definitions: WiktionarySense[] };

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** "plural of doctor" style senses link to their base word; returns it when every sense is one. */
function formOfTarget(entries: WiktionaryEntry[]) {
  const senses = entries.flatMap((e) => e.definitions).filter((d) => stripHtml(d.definition).length > 1);
  if (!senses.length || !senses.every((d) => d.definition.includes("form-of-definition"))) return null;
  const link = senses[0].definition.match(/form-of-definition-link[\s\S]*?title="([^"#]+)/);
  return link ? { base: link[1], note: stripHtml(senses[0].definition) } : null;
}

async function fetchWiktionary(word: string, followForms = true): Promise<Definition | null> {
  const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
    headers: { "User-Agent": "FolioEnglish/0.1 (https://github.com/lorangutan/english-articles)" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const entries = ((await res.json()) as { en?: WiktionaryEntry[] }).en ?? [];

  // Learners need the meaning of "doctor", not just "plural of doctor": follow the link once.
  const form = followForms ? formOfTarget(entries) : null;
  if (form && form.base.toLowerCase() !== word) {
    const base = (await fetchFreeDictionary(form.base).catch(() => null)) ?? (await fetchWiktionary(form.base, false));
    if (base) return { ...base, formOf: `${word} · ${form.note}` };
  }

  const meanings = entries
    .map((e) => ({
      partOfSpeech: e.partOfSpeech.toLowerCase(),
      definitions: e.definitions
        .map((d) => ({
          definition: stripHtml(d.definition),
          example: d.parsedExamples?.[0]?.example ? stripHtml(d.parsedExamples[0].example) : d.examples?.[0] ? stripHtml(d.examples[0]) : null,
        }))
        .filter((d) => d.definition.length > 1)
        .slice(0, 3),
    }))
    .filter((m) => m.definitions.length)
    .slice(0, 3);
  return meanings.length ? { word, phonetic: null, audio: null, meanings } : null;
}

async function fetchRemote(word: string): Promise<Definition | null> {
  return (await fetchFreeDictionary(word).catch(() => null)) ?? (await fetchWiktionary(word));
}

async function cached(word: string): Promise<Definition | null | undefined> {
  const [rows] = await db().execute("SELECT payload FROM word_cache WHERE word = ?", [word]);
  const row = (rows as { payload: string | null }[])[0];
  if (!row) return undefined;
  return row.payload ? (JSON.parse(row.payload) as Definition) : null;
}

async function lookupOne(word: string): Promise<Definition | null> {
  const hit = await cached(word);
  if (hit !== undefined) return hit;
  const def = await fetchRemote(word);
  await db().execute("REPLACE INTO word_cache (word, payload) VALUES (?, ?)", [word, def ? JSON.stringify(def) : null]);
  return def;
}

export async function define(input: string): Promise<Definition | null> {
  const word = normalizeWord(input);
  if (!word || word.length > 64) return null;
  for (const candidate of [word, ...fallbacks(word)]) {
    const def = await lookupOne(candidate);
    if (def) return def;
  }
  return null;
}
