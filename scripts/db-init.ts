// Creates the tables in DATABASE_URL (safe to re-run: every statement is IF NOT EXISTS).
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = sql.replace(/--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);

for (const statement of statements) await db().query(statement);
console.log(`Applied ${statements.length} statements.`);
await db().end();
