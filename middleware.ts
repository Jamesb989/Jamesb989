// middleware.ts  — root file executed by Next.js Edge Middleware
console.log("🛠️  LLM middleware LOADED");

import { NextResponse, type NextRequest } from "next/server";
import sigs from "./signatures/llm";

// extend to access req.ip at runtime
interface NextRequestWithIP extends NextRequest {
  ip?: string;
}

export const config = { matcher: "/:path*" };

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text + (process.env.SALT ?? ""))
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(rawReq: NextRequest) {
  const req = rawReq as NextRequestWithIP;

  const ua   = req.headers.get("user-agent") ?? "";
  const ip   =
    req.headers.get("x-forwarded-for") ??
    req.ip ??
    "";
  const path = req.nextUrl.pathname;

  console.log("🔍 incoming UA:", ua);

  for (const { family, regex } of Object.values(
    sigs as Record<string, { family: string; regex: RegExp }>
  )) {
    console.log(`… testing against [${family}]:`, regex, "→", regex.test(ua));

    if (regex.test(ua)) {
      console.log("✅ matched:", family);

      // non-blocking analytics POST
      fetch(`${req.nextUrl.origin}/api/log-bot`, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ts: Date.now(),
          siteId: process.env.NEXT_PUBLIC_SITE_ID,
          llmFamily: family,
          path,
          ipHash: await sha256(ip),
        }),
      }).catch(() => {});

      console.log("🤖 detected:", family, "→", path);
      break;
    }
  }

  return NextResponse.next();
}
