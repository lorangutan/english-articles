import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-32 text-center sm:px-10">
      <p className="eyebrow">Not found</p>
      <h1 className="display mt-6 text-5xl">This page has left the shelf.</h1>
      <Link href="/read" className="btn mt-12">Back to the library</Link>
    </main>
  );
}
