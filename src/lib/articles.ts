import { db } from "./db";
import { TOPIC_SLUGS } from "./topics";

export type ArticleCard = {
  id: number;
  title: string;
  dek: string | null;
  author: string | null;
  topic: string;
  source: string;
  wordCount: number;
  cefr: string;
  band: number;
};

export type Article = ArticleCard & { url: string; body: string; publishedAt: string | null };

const CARD_COLUMNS = "id, title, dek, author, topic, source, word_count AS wordCount, cefr, band";

/** A fresh random selection for a band, optionally limited to some topics. */
export async function randomArticles(band: number, topics: string[], limit = 7, exclude: number[] = []) {
  const valid = topics.filter((t) => TOPIC_SLUGS.includes(t));
  const where = ["band = ?"];
  const params: (string | number)[] = [band];
  if (valid.length) {
    where.push(`topic IN (${valid.map(() => "?").join(",")})`);
    params.push(...valid);
  }
  const skip = exclude.filter(Number.isInteger).slice(0, 200);
  if (skip.length) {
    where.push(`id NOT IN (${skip.map(() => "?").join(",")})`);
    params.push(...skip);
  }
  // ORDER BY RAND() is fine at this library size (tens of thousands of rows).
  const [rows] = await db().query(
    `SELECT ${CARD_COLUMNS} FROM articles WHERE ${where.join(" AND ")} ORDER BY RAND() LIMIT ${Math.min(Math.max(1, limit), 20)}`,
    params,
  );
  return rows as ArticleCard[];
}

export async function getArticle(id: number) {
  const [rows] = await db().execute(
    `SELECT ${CARD_COLUMNS}, url, body, published_at AS publishedAt FROM articles WHERE id = ?`,
    [id],
  );
  return (rows as Article[])[0] ?? null;
}

export async function libraryCount() {
  const [rows] = await db().query("SELECT COUNT(*) AS n FROM articles");
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 200));
}
