import WordList from "@/components/WordList";

export const metadata = { title: "Notebook — Folio" };

export default function WordsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-16 sm:px-10">
      <p className="eyebrow">Your notebook</p>
      <h1 className="display mt-5 text-5xl sm:text-6xl">Words you have met</h1>
      <p className="mt-5 max-w-xl font-light leading-relaxed text-ink-soft">
        Every word you tap while reading is noted here, with how often you looked it up. Choose the ones to memorise.
      </p>
      <WordList />
    </main>
  );
}
