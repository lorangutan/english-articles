import { XMLParser } from "fast-xml-parser";
import he from "he";

export type RawArticle = {
  source: "conversation" | "simplewiki";
  sourceId: string;
  title: string;
  dek: string | null;
  author: string | null;
  url: string;
  topic: string;
  body: string; // paragraphs separated by blank lines; headings prefixed "## ", fine print "^^ "
  publishedAt: Date | null;
};

// Wikimedia asks for a descriptive User-Agent with a contact URL and throttles generic ones.
const UA = "FolioEnglish/0.1 (https://github.com/lorangutan/english-articles; English reading practice)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, attempt = 0): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  // Wikimedia rate-limits bursts; back off and retry a couple of times.
  if (res.status === 429 && attempt < 3) {
    await sleep(2000 * (attempt + 1));
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function clean(text: string) {
  return he.decode(text.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Turns article HTML into our plain paragraph format. */
export function htmlToBody(html: string) {
  const blocks: string[] = [];
  const re = /<(p|h2|h3|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(re)) {
    const text = clean(m[3]);
    if (!text || /^(Read more|Read more:|This article is republished)/i.test(text)) continue;
    // The Conversation ends each piece with the authors' disclosure statement.
    if (/fine-print/.test(m[2])) blocks.push(`^^ ${text}`);
    else blocks.push(m[1].toLowerCase().startsWith("h") ? `## ${text}` : text);
  }
  return blocks.join("\n\n");
}

// --- The Conversation -------------------------------------------------------
// Articles are published under CC BY-ND 4.0: republishing is allowed with credit,
// a link back, and no edits to the text. We keep the text intact and link the original.

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

type AtomEntry = {
  id: string;
  title: string | { "#text": string };
  link: { href: string } | { href: string }[];
  published?: string;
  summary?: string;
  content?: string | { "#text": string };
  author?: { name: string } | { name: string }[];
};

const text = (v: unknown) => (typeof v === "string" ? v : ((v as { "#text"?: string })?.["#text"] ?? ""));

export async function fetchConversation(feedPath: string, topic: string): Promise<RawArticle[]> {
  const feed = xml.parse(await get(`https://theconversation.com/${feedPath}/articles.atom`));
  const entries: AtomEntry[] = [feed?.feed?.entry ?? []].flat();
  return entries.map((e) => {
    const link = [e.link].flat()[0]?.href ?? "";
    const authors = [e.author ?? []].flat().map((a) => a.name).filter(Boolean);
    return {
      source: "conversation" as const,
      sourceId: String(e.id).split("/").pop() ?? link,
      title: clean(text(e.title)),
      dek: e.summary ? clean(text(e.summary)).slice(0, 600) : null,
      author: authors.length ? authors.join(", ").slice(0, 200) : null,
      url: link,
      topic,
      body: htmlToBody(text(e.content)),
      publishedAt: e.published ? new Date(e.published) : null,
    };
  });
}

// --- Simple English Wikipedia ----------------------------------------------
// CC BY-SA 4.0. Written for learners, so it fills the Foundation and Intermediate bands.

const WIKI = "https://simple.wikipedia.org/w/api.php?format=json&formatversion=2&origin=*";

export async function fetchSimpleWiki(search: string, topic: string, count = 4): Promise<RawArticle[]> {
  const offset = Math.floor(Math.random() * 60);
  const list = JSON.parse(
    await get(`${WIKI}&action=query&list=search&srnamespace=0&srlimit=${count}&sroffset=${offset}&srsearch=${encodeURIComponent(search)}`),
  );
  const titles: string[] = (list?.query?.search ?? []).map((s: { title: string }) => s.title);

  const out: RawArticle[] = [];
  for (const title of titles) {
    if (/^List of|disambiguation/i.test(title)) continue;
    await sleep(1000);
    // Whole-page extracts come back one page per request.
    const page = JSON.parse(
      await get(`${WIKI}&action=query&prop=extracts|info&explaintext=1&exsectionformat=wiki&inprop=url&titles=${encodeURIComponent(title)}`),
    )?.query?.pages?.[0];
    if (!page?.extract) continue;
    out.push({
      source: "simplewiki",
      sourceId: String(page.pageid),
      title: page.title,
      dek: null,
      author: "Simple English Wikipedia",
      url: page.fullurl,
      topic,
      body: wikiToBody(page.extract),
      publishedAt: null,
    });
  }
  return out;
}

const WIKI_TAIL = /^(References|Other websites|Related pages|Notes|Sources|Further reading|Gallery)$/i;

function wikiToBody(extract: string) {
  const blocks: string[] = [];
  for (const raw of extract.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^=+\s*(.*?)\s*=+$/);
    if (heading) {
      if (WIKI_TAIL.test(heading[1])) break;
      blocks.push(`## ${heading[1]}`);
    } else {
      blocks.push(line);
    }
  }
  // Drop headings left with nothing under them.
  return blocks.filter((b, i) => !(b.startsWith("## ") && (blocks[i + 1] ?? "## ").startsWith("## "))).join("\n\n");
}
