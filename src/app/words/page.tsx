import WordList from "@/components/WordList";

export const metadata = { title: "My words — Folio" };

export default function WordsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-16 sm:px-10">
      <p className="eyebrow">Your vocabulary</p>
      <h1 className="display mt-5 text-5xl sm:text-6xl">Words you have kept</h1>
      <WordList />
    </main>
  );
}
