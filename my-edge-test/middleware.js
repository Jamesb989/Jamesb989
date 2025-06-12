import { NextResponse } from "next/server";

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const logPayload = {
    tag: "[EDGE-REMOTE-LOG]",
    ua,
    path: url.pathname,
    method: request.method,
    ts: Date.now()
  };

  // Fire-and-forget POST to your API route
  fetch(`${url.origin}/api/edge-log`, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(logPayload)
  }).catch(() => {});

  // Always continue to the next handler/page
  return NextResponse.next();
}