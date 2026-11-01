"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BANDS, SCALE_LABEL, type Scale } from "@/lib/levels";
import { loadPreferences, savePreferences } from "@/lib/preferences";
import { TOPICS } from "@/lib/topics";

export default function LevelPicker() {
  const router = useRouter();
  const [scale, setScale] = useState<Scale>("cefr");
  const [band, setBand] = useState<number | null>(null);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    const saved = loadPreferences();
    if (!saved) return;
    setScale(saved.scale);
    setBand(saved.band);
    setTopics(saved.topics);
  }, []);

  const toggleTopic = (slug: string) =>
    setTopics((t) => (t.includes(slug) ? t.filter((s) => s !== slug) : [...t, slug]));

  const begin = () => {
    if (!band) return;
    savePreferences({ band, topics, scale });
    const q = new URLSearchParams({ band: String(band) });
    if (topics.length) q.set("topics", topics.join(","));
    router.push(`/read?${q}`);
  };

  return (
    <div>
      {/* Step one: level, on whichever scale the reader knows */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">I — Your level</p>
          <h3 className="display mt-3 text-3xl sm:text-4xl">Where do you read today?</h3>
        </div>
        <div role="tablist" aria-label="Level scale" className="flex border hairline">
          {(Object.keys(SCALE_LABEL) as Scale[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={scale === s}
              onClick={() => setScale(s)}
              className={`px-4 py-2 text-[0.68rem] uppercase tracking-eyebrow transition-colors ${
                scale === s ? "bg-ink text-ivory" : "text-ink-soft hover:text-ink"
              }`}
            >
              {SCALE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div role="radiogroup" aria-label="Reading level" className="mt-10 grid border-t hairline sm:grid-cols-2 lg:grid-cols-4">
        {BANDS.map((b) => {
          const active = band === b.id;
          return (
            <button
              key={b.id}
              role="radio"
              aria-checked={active}
              onClick={() => setBand(b.id)}
              className={`group -mt-px border-b border-t px-4 py-7 text-left transition-colors sm:px-6 lg:border-b-0 lg:border-r lg:border-r-rule lg:last:border-r-0 ${
                active ? "border-t-gold border-b-rule bg-ivory" : "border-t-transparent border-b-rule hover:bg-ivory/60"
              }`}
            >
              <span className={`block font-serif text-4xl transition-colors ${active ? "text-ink" : "text-ink-soft group-hover:text-ink"}`}>
                {b[scale]}
              </span>
              <span className="mt-4 flex items-center gap-2 text-[0.7rem] uppercase tracking-eyebrow">
                <span className={`inline-block h-px transition-all duration-500 ${active ? "w-8 bg-gold" : "w-3 bg-rule"}`} />
                {b.name}
              </span>
              <span className="mt-2 block text-sm font-light text-ink-soft">{b.blurb}</span>
            </button>
          );
        })}
      </div>

      {/* Step two: interests */}
      <div className="mt-20">
        <p className="eyebrow">II — Your curiosity</p>
        <h3 className="display mt-3 text-3xl sm:text-4xl">What would you happily read about?</h3>
        <p className="mt-3 text-sm font-light text-ink-soft">Choose any. Leave all unselected for a little of everything.</p>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {TOPICS.map((t) => {
            const on = topics.includes(t.slug);
            return (
              <button
                key={t.slug}
                aria-pressed={on}
                onClick={() => toggleTopic(t.slug)}
                className={`border px-5 py-2.5 text-sm transition-colors duration-300 ${
                  on ? "border-ink bg-ink text-ivory" : "hairline text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-6">
        <button onClick={begin} disabled={!band} className="btn">
          Open my library <span aria-hidden>→</span>
        </button>
        {!band && <span className="text-sm font-light text-ink-faint">Choose a level to continue.</span>}
      </div>
    </div>
  );
}
