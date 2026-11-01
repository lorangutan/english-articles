import { db } from "./db";
import { estimateLevel, SOURCE_FLOOR } from "./level";
import { fetchConversation, fetchSimpleWiki, type RawArticle } from "./sources";
import { TOPICS, type Topic } from "./topics";

const MIN_WORDS = 150;
const MAX_WORDS = 3500;

export type IngestReport = { fetched: number; stored: number; skipped: number; errors: string[] };

async function store(articles: RawArticle[], report: IngestReport) {
  for (const a of articles) {
    report.fetched++;
    const prose = a.body.split("\n\n").filter((b) => !b.startsWith("## ") && !b.startsWith("^^ ")).join("\n");
    const level = estimateLevel(prose, SOURCE_FLOOR[a.source]);
    const isList = /^(This is a list|The following is a list)/i.test(prose) || /^(List|Lists|Meanings) of /i.test(a.title);
    if (!a.title || !a.url || isList || level.words < MIN_WORDS || level.words > MAX_WORDS) {
      report.skipped++;
      continue;
    }
    const [res] = await db().execute(
      `INSERT IGNORE INTO articles
         (source, source_id, title, dek, author, url, topic, body, word_count, difficulty, cefr, band, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.source, a.sourceId, a.title.slice(0, 300), a.dek, a.author, a.url.slice(0, 500), a.topic, a.body,
        level.words, level.difficulty, level.cefr, level.band, a.publishedAt],
    );
    if ((res as { affectedRows: number }).affectedRows) report.stored++;
    else report.skipped++;
  }
}

/** Pulls fresh articles for the given topics (default: all) and stores the new ones. */
export async function ingest(topics: Topic[] = TOPICS, wikiPerTerm = 2, { feeds = true } = {}): Promise<IngestReport> {
  const report: IngestReport = { fetched: 0, stored: 0, skipped: 0, errors: [] };
  for (const topic of topics) {
    const jobs = [
      ...(feeds ? topic.feeds : []).map((f) => () => fetchConversation(f, topic.slug)),
      // Two random search terms per run keep the beginner shelf varied.
      ...[...topic.wiki].sort(() => Math.random() - 0.5).slice(0, 2).map((term) => () => fetchSimpleWiki(term, topic.slug, wikiPerTerm)),
    ];
    for (const job of jobs) {
      try {
        await store(await job(), report);
      } catch (err) {
        report.errors.push(`${topic.slug}: ${(err as Error).message}`);
      }
    }
  }
  return report;
}
