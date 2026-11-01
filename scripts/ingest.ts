// Fills the library. `npm run ingest` pulls every topic; pass topic slugs to limit it,
// e.g. `npm run ingest -- science food`, `--wiki=N` for more beginner pages per search term,
// and `--wiki-only` to top up the beginner shelf without refetching magazine feeds.
import { db } from "../src/lib/db";
import { ingest } from "../src/lib/ingest";
import { TOPICS } from "../src/lib/topics";

const args = process.argv.slice(2);
const wiki = Number(args.find((a) => a.startsWith("--wiki="))?.split("=")[1] ?? 3);
const slugs = args.filter((a) => !a.startsWith("--"));
const topics = slugs.length ? TOPICS.filter((t) => slugs.includes(t.slug)) : TOPICS;

const report = await ingest(topics, wiki, { feeds: !args.includes("--wiki-only") });
console.log(report);

const [rows] = await db().query("SELECT band, cefr, source, COUNT(*) n, ROUND(AVG(difficulty),1) avg FROM articles GROUP BY band, cefr, source ORDER BY band, cefr");
console.table(rows);
await db().end();
