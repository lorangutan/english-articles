// Re-runs the level estimate over every stored article (no refetching).
// Use after changing src/lib/level.ts; prints the new distribution per source.
import { db } from "../src/lib/db";
import { estimateLevel, SOURCE_FLOOR } from "../src/lib/level";

const [rows] = await db().query("SELECT id, source, body FROM articles");
for (const { id, source, body } of rows as { id: number; source: string; body: string }[]) {
  const prose = body.split("\n\n").filter((b) => !b.startsWith("## ") && !b.startsWith("^^ ")).join("\n");
  const level = estimateLevel(prose, SOURCE_FLOOR[source]);
  await db().execute("UPDATE articles SET difficulty = ?, cefr = ?, band = ?, word_count = ? WHERE id = ?",
    [level.difficulty, level.cefr, level.band, level.words, id]);
}

const [dist] = await db().query(
  `SELECT source, cefr, COUNT(*) n, ROUND(MIN(difficulty),1) min, ROUND(AVG(difficulty),1) avg, ROUND(MAX(difficulty),1) max
     FROM articles GROUP BY source, cefr ORDER BY source, cefr`,
);
console.log(`Rescored ${(rows as unknown[]).length} articles.`);
console.table(dist);
await db().end();
