"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleCard } from "@/lib/articles";
import { BANDS, bandById } from "@/lib/levels";
import { loadPreferences, savePreferences } from "@/lib/preferences";
import { TOPICS, topicLabel } from "@/lib/topics";

const minutes = (w: number) => Math.max(1, Math.round(w / 200));

function Meta({ a }: { a: ArticleCard }) {
  return (
    <p className="text-[0.68rem] uppercase tracking-eyebrow text-ink-faint">
      <span className="text-gold-deep">{topicLabel(a.topic)}</span>
      <span className="mx-2.5">·</span>
      {a.cefr}
      <span className="mx-2.5">·</span>
      {minutes(a.wordCount)} min
    </p>
  );
}

export default function Library() {
  const router = useRouter();
  const params = useSearchParams();
  const [band, setBand] = useState<number | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [articles, setArticles] = useState<ArticleCard[] | null>(null);
  const [error, setError] = useState(false);
  const seen = useRef<number[]>([]);

  // Level and topics come from the URL, then saved preferences, then a sensible default.
  useEffect(() => {
    const saved = loadPreferences();
    const b = Number(params.get("band")) || saved?.band || 2;
    const t = params.get("topics")?.split(",").filter(Boolean) ?? saved?.topics ?? [];
    setBand(b);
    setTopics(t);
  }, [params]);

  const load = useCallback(async (b: number, t: string[], fresh: boolean) => {
    if (fresh) seen.current = [];
    setArticles(null);
    setError(false);
    const q = new URLSearchParams({ band: String(b), limit: "7" });
    if (t.length) q.set("topics", t.join(","));
    if (seen.current.length) q.set("exclude", seen.current.join(","));
    try {
      const res = await fetch(`/api/articles?${q}`);
      if (!res.ok) throw new Error();
      let list = ((await res.json()) as { articles: ArticleCard[] }).articles;
      // Everything seen: start the rotation again.
      if (!list.length && seen.current.length) {
        seen.current = [];
        return load(b, t, true);
      }
      seen.current.push(...list.map((a) => a.id));
      setArticles(list);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (band) load(band, topics, true);
  }, [band, topics, load]);

  const update = (b: number, t: string[]) => {
    const prefs = loadPreferences();
    savePreferences({ band: b, topics: t, scale: prefs?.scale ?? "cefr" });
    const q = new URLSearchParams({ band: String(b) });
    if (t.length) q.set("topics", t.join(","));
    router.replace(`/read?${q}`, { scroll: false });
  };

  const current = band ? bandById(band) : null;
  const [lead, ...rest] = articles ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 sm:px-10">
      {/* Masthead + controls */}
      <section className="pb-14 pt-16">
        <p className="eyebrow">Today&rsquo;s selection</p>
        <h1 className="display mt-5 text-5xl sm:text-6xl">
          {current ? current.name : " "}
          {current && <span className="ml-4 align-middle font-sans text-sm tracking-eyebrow text-ink-faint">{current.cefr}</span>}
        </h1>

        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-y hairline py-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="eyebrow text-ink-faint">Level</span>
            {BANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => update(b.id, topics)}
                className={`transition-colors ${band === b.id ? "text-ink underline decoration-gold underline-offset-[6px]" : "text-ink-faint hover:text-ink"}`}
              >
                {b.cefr}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="eyebrow text-ink-faint">Subjects</span>
            {TOPICS.map((t) => {
              const on = topics.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  aria-pressed={on}
                  onClick={() => update(band ?? 2, on ? topics.filter((s) => s !== t.slug) : [...topics, t.slug])}
                  className={`transition-colors ${on ? "text-ink underline decoration-gold underline-offset-[6px]" : "text-ink-faint hover:text-ink"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error && (
        <p className="py-24 text-center font-serif text-2xl text-ink-soft">The library is resting. Please try again shortly.</p>
      )}

      {!error && articles === null && (
        <div className="space-y-8 py-10" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-paper" />
          ))}
        </div>
      )}

      {articles && articles.length === 0 && (
        <p className="py-24 text-center font-serif text-2xl text-ink-soft">
          Nothing on this shelf yet. Try another subject or level.
        </p>
      )}

      {lead && (
        <>
          <Link href={`/article/${lead.id}`} className="group block border-b hairline pb-16">
            <Meta a={lead} />
            <h2 className="display mt-6 max-w-4xl text-4xl transition-colors group-hover:text-gold-deep sm:text-6xl">{lead.title}</h2>
            {lead.dek && <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-ink-soft">{lead.dek}</p>}
            <p className="mt-8 text-[0.7rem] uppercase tracking-eyebrow text-ink-soft">
              {lead.author ?? "Folio"} <span className="ml-3 text-gold-deep">Read →</span>
            </p>
          </Link>

          <ol className="grid gap-x-14 sm:grid-cols-2">
            {rest.map((a, i) => (
              <li key={a.id} className="border-b hairline">
                <Link href={`/article/${a.id}`} className="group grid grid-cols-[2.5rem_1fr] gap-3 py-9">
                  <span className="font-serif text-xl text-gold">{String(i + 2).padStart(2, "0")}</span>
                  <div>
                    <Meta a={a} />
                    <h3 className="mt-3 font-serif text-2xl leading-snug transition-colors group-hover:text-gold-deep">{a.title}</h3>
                    {a.dek && <p className="mt-3 line-clamp-2 text-sm font-light leading-relaxed text-ink-soft">{a.dek}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-16 text-center">
            <button onClick={() => band && load(band, topics, false)} className="btn">
              Another selection <span aria-hidden>↻</span>
            </button>
          </div>
        </>
      )}
    </main>
  );
}
