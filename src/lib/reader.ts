import type { NextRequest } from "next/server";

/** The anonymous reader id the browser sends in X-Reader-Id, if well-formed. */
export function readerIdFrom(req: NextRequest) {
  const id = req.headers.get("x-reader-id") ?? "";
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
