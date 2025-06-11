// middleware.ts — Edge Middleware executed on every request
console.log("🛠️  LLM middleware LOADED");

import { NextResponse, type NextRequest } from "next/server";
import sigs from "./signatures/llm";

export const config = { matcher: ["/", "/:path*"] };

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text + (process.env.SALT ?? ""))
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

interface NextRequestWithIP extends NextRequest {
  ip?: string;
}

export async function middleware(rawReq: NextRequest) {
  const req = rawReq as NextRequestWithIP;
  const ua   = req.headers.get("user-agent") ?? "";
  const ip   =
    req.headers.get("x-forwarded-for") ??
    req.ip ??
    "";
  const path = req.nextUrl.pathname;

  console.log("INCOMING UA:", req.headers.get("user-agent"), "| PATH:", req.nextUrl.pathname);

  let matched = false;
  for (const { family, regex } of Object.values(
    sigs as Record<string, { family: string; regex: RegExp }>
  )) {
    console.log(`🔎 Testing regex for ${family}:`, regex);
    if (regex.test(ua)) {
      matched = true;
      console.log("✅ matched:", family, "| UA:", ua, "| PATH:", path);

      const payload = {
        ts: Date.now(),
        siteId: process.env.NEXT_PUBLIC_SITE_ID,
        llmFamily: family,
        path,
        ipHash: await sha256(ip),
        userAgent: ua,
      };

      // POST analytics
      fetch(`${req.nextUrl.origin}/api/log-bot`, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(r => console.log("📬 POST status:", r.status))
        .catch(e => console.log("❌ POST error:", e));

      console.log("🤖 detected:", family, "→", path);
      break;
    }
  }

  if (!matched) {
    console.log("No LLM UA match for:", ua, "| PATH:", path);
  }  

  return NextResponse.next();
}

