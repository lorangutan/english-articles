import LevelPicker from "@/components/LevelPicker";
import { libraryCount } from "@/lib/articles";

export const revalidate = 3600;

const FRUSTRATIONS = [
  {
    title: "The article bores you.",
    body: "Textbook passages about someone else's weekend. When a text doesn't touch what you care about, attention drifts and nothing stays.",
  },
  {
    title: "Every new word means another app.",
    body: "Copy, switch, paste, search, switch back — and the thread of the sentence is gone. The friction quietly ends the reading session.",
  },
  {
    title: "You never know if it's your level.",
    body: "Too easy and you learn nothing; too hard and you stop. Finding the narrow band in between takes longer than the reading itself.",
  },
];

const PROMISES = [
  {
    title: "Curiosity, turned into reading.",
    body: "Choose the subjects you would read in your own language. Interest carries you further, and more often — quantity and quality, together.",
  },
  {
    title: "A library that does not run dry.",
    body: "Essays by scholars and clear explainers, refreshed every day and sorted by level, so there is always a next piece waiting.",
  },
  {
    title: "Every word, one tap away.",
    body: "Touch any word for its meaning, pronunciation and an example — then keep it in your own word list without leaving the page.",
  },
];

async function safeCount() {
  try {
    return await libraryCount();
  } catch {
    return null;
  }
}

export default async function Home() {
  const count = await safeCount();

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-28 pt-20 sm:px-10 sm:pt-28">
        <p className="eyebrow">An English reading room</p>
        <h1 className="display mt-8 max-w-4xl text-[2.9rem] sm:text-7xl lg:text-[5.4rem]">
          Read what you are <em className="text-gold-deep">curious</em> about.
          <br className="hidden sm:block" /> Learn every word you meet.
        </h1>
        <div className="mt-12 grid gap-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <p className="max-w-md text-lg font-light leading-relaxed text-ink-soft">
            Thoughtful articles chosen for your level — CEFR, IELTS or TOEFL — and for the subjects you already love.
          </p>
          <a href="#begin" className="btn self-start sm:self-auto">
            Begin reading <span aria-hidden>↓</span>
          </a>
        </div>
        {count ? (
          <p className="mt-20 text-xs uppercase tracking-eyebrow text-ink-faint">
            <span className="font-serif text-2xl normal-case tracking-normal text-ink">{count.toLocaleString("en")}</span>
            <span className="ml-3">articles in the library, growing daily</span>
          </p>
        ) : null}
      </section>

      {/* Frustration hook */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
          <div className="grid gap-14 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="eyebrow">The impasse</p>
              <h2 className="display mt-6 text-4xl sm:text-5xl">
                When you learn English, do you feel stuck on these?
              </h2>
            </div>
            <ol className="border-t hairline">
              {FRUSTRATIONS.map((f, i) => (
                <li key={f.title} className="grid grid-cols-[3rem_1fr] gap-4 border-b hairline py-9 sm:grid-cols-[5rem_1fr]">
                  <span className="font-serif text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-serif text-2xl">{f.title}</h3>
                    <p className="mt-3 max-w-lg font-light leading-relaxed text-ink-soft">{f.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
        <p className="eyebrow text-center">Instead</p>
        <h2 className="display mx-auto mt-6 max-w-3xl text-center text-4xl sm:text-5xl">
          Set the worry down. <em className="text-gold-deep">Simply read.</em>
        </h2>
        <div className="mt-20 grid gap-px bg-rule sm:grid-cols-3">
          {PROMISES.map((p, i) => (
            <div key={p.title} className="bg-ivory px-1 py-10 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <span className="eyebrow">{["I", "II", "III"][i]}</span>
              <h3 className="mt-6 font-serif text-[1.65rem] leading-tight">{p.title}</h3>
              <p className="mt-4 font-light leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Picker */}
      <section id="begin" className="scroll-mt-10 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
          <LevelPicker />
        </div>
      </section>
    </main>
  );
}
