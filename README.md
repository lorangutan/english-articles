# Folio — English, read at your level

A reading room for English learners. Pick a level (CEFR, IELTS or TOEFL) and the subjects you care about; Folio serves a random selection of real articles at that level. Tap any word for its meaning, pronunciation and an example, and keep it in your own word list.

Runs entirely on free tiers: **Next.js on Vercel (Hobby)** + **TiDB Cloud Serverless** + key-less public APIs.

## How it works

| Piece | Source | Notes |
| :--- | :--- | :--- |
| Articles (B1–C2) | [The Conversation](https://theconversation.com) Atom feeds | Full text, CC BY-ND 4.0 — republished unedited, with author, credit and link. |
| Articles (A1–B2) | [Simple English Wikipedia](https://simple.wikipedia.org) API | Written for learners; CC BY-SA 4.0. |
| Definitions | [Free Dictionary API](https://dictionaryapi.dev), then [Wiktionary REST](https://en.wiktionary.org/api/rest_v1/) | No keys. Cached in `word_cache`. |
| Levels | `src/lib/level.ts` | Flesch–Kincaid grade + share of words outside a core 1,000-word list → CEFR. An estimate, not a test. |

**Bands** (one picker, three scales — `src/lib/levels.ts`):

| Band | CEFR | IELTS | TOEFL iBT |
| :--- | :--- | :--- | :--- |
| Foundation | A1 – A2 | 3.0 – 4.0 | under 42 |
| Intermediate | B1 | 4.5 – 5.0 | 42 – 71 |
| Upper intermediate | B2 | 5.5 – 6.5 | 72 – 94 |
| Advanced | C1 – C2 | 7.0 – 9.0 | 95 – 120 |

**Library growth:** `npm run ingest` fills it in one go; afterwards a daily Vercel Cron (`vercel.json` → `/api/ingest`) refreshes three random topics.

**Word lists** have no accounts: the browser keeps an anonymous reader id and saved words are stored against it in `saved_words`.

## API

| Route | Purpose |
| :--- | :--- |
| `GET /api/articles?band=1-4&topics=science,food&exclude=ids&limit=7` | Random articles for a band |
| `GET /api/define?word=curiosity` | Definition, phonetic, audio, examples |
| `GET / POST / DELETE /api/words` (header `X-Reader-Id`) | A reader's saved words |
| `GET /api/ingest` (header `Authorization: Bearer $CRON_SECRET`) | Pull new articles |

## Run locally

```bash
cp .env.example .env.local     # set DATABASE_URL (MySQL/MariaDB/TiDB) and CRON_SECRET
npm install
npm run db:init                # create tables
npm run ingest                 # fill the library (~2–3 min)
npm run dev
```

Other scripts: `npm run ingest -- science food --wiki=6` (chosen topics, more beginner pages), `npm run rescore` (re-level every stored article after editing `level.ts`).

## Deploy (free: TiDB Cloud + Vercel)

**1. Database — TiDB Cloud**
1. In [tidbcloud.com](https://tidbcloud.com), open your existing Serverless cluster (or create one).
2. In its **SQL Editor** run `CREATE DATABASE folio_english;`
3. **Connect** → choose a general connection string, generate/reset the password, and copy it as
   `mysql://<user>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/folio_english`
   (TLS is turned on automatically for `*.tidbcloud.com`).
4. Locally, put that string in `.env.local` as `DATABASE_URL`, then run `npm run db:init` and `npm run ingest -- --wiki=5`.

**2. App — Vercel**
1. Push this folder to a new GitHub repository.
2. In [vercel.com](https://vercel.com): **Add New → Project → Import** the repo (Next.js preset, no changes).
3. **Environment Variables:** `DATABASE_URL` (the TiDB string) and `CRON_SECRET` (any long random string).
4. **Deploy.** The cron in `vercel.json` runs daily at 06:00 UTC.

Check: open the site → the landing page shows the article count; `/api/articles?band=3` returns JSON.
