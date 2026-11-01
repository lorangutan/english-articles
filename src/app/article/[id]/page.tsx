import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reader from "@/components/Reader";
import { getArticle, readingMinutes } from "@/lib/articles";
import { bandById } from "@/lib/levels";
import { topicLabel } from "@/lib/topics";

export const revalidate = 86400;

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? getArticle(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await load(params);
  return { title: article ? `${article.title} — Folio` : "Folio" };
}

const CREDIT: Record<string, { name: string; license: string; licenseUrl: string }> = {
  conversation: { name: "The Conversation", license: "CC BY-ND 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nd/4.0/" },
  simplewiki: { name: "Simple English Wikipedia", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
};

export default async function ArticlePage({ params }: Props) {
  const article = await load(params);
  if (!article) notFound();

  const band = bandById(article.band);
  const credit = CREDIT[article.source];
  const blocks = article.body.split("\n\n").filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-6 sm:px-10">
      <article className="mx-auto max-w-measure pt-16">
        <Link href={`/read?band=${article.band}`} className="btn-quiet">← {band.name} library</Link>

        <p className="eyebrow mt-14">
          {topicLabel(article.topic)}
          <span className="mx-3 text-rule">—</span>
          Est. {article.cefr}
          <span className="mx-3 text-rule">—</span>
          {readingMinutes(article.wordCount)} min read
        </p>
        <h1 className="display mt-6 text-[2.5rem] sm:text-[3.4rem]">{article.title}</h1>
        {article.dek && <p className="mt-6 font-serif text-xl italic leading-relaxed text-ink-soft">{article.dek}</p>}
        <p className="mt-8 border-y hairline py-4 text-[0.7rem] uppercase tracking-eyebrow text-ink-soft">
          {article.author ?? credit?.name}
          {credit && article.author !== credit.name && <span className="text-ink-faint"> · {credit.name}</span>}
        </p>

        <p className="mt-10 text-xs font-light text-ink-faint">Tap any word for its meaning.</p>
        <div className="mt-2">
          <Reader blocks={blocks} articleId={article.id} />
        </div>

        {credit && (
          <p className="mt-16 border-t hairline pt-6 text-xs leading-relaxed text-ink-faint">
            Originally published by{" "}
            <a href={article.url} target="_blank" rel="noopener" className="text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink">
              {credit.name}
            </a>{" "}
            under{" "}
            <a href={credit.licenseUrl} target="_blank" rel="noopener" className="underline decoration-rule underline-offset-4 hover:text-ink">
              {credit.license}
            </a>
            . Level is an automatic estimate.
          </p>
        )}

        <div className="mt-16 text-center">
          <Link href={`/read?band=${article.band}`} className="btn">Next article →</Link>
        </div>
      </article>
    </main>
  );
}
