import { NextResponse, type NextRequest } from "next/server";
import { define } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

// GET /api/define?word=curiosity
export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word") ?? "";
  try {
    const definition = await define(word);
    if (!definition) return NextResponse.json({ error: "No entry found" }, { status: 404 });
    return NextResponse.json(definition, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch (err) {
    console.error("[api/define]", err);
    return NextResponse.json({ error: "Dictionary unavailable" }, { status: 502 });
  }
}
