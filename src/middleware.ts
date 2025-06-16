import { NextResponse } from "next/server";

const LLM_SIGNATURES: { family: string; regex: RegExp }[] = [
  { family: "Claude", regex: /Claude(?:Bot)?/i },
  { family: "ChatGPT", regex: /ChatGPT/i },
  { family: "Grok", regex: /Grok/i },
  { family: "Perplexity", regex: /Perplexity|pJsonScraper/i },
  { family: "BingAI", regex: /BingPreview|BingAI|Bingbot|MS Search|msnbot/i },
  { family: "Gemini", regex: /Gemini|Google-Extended|Google-LLM/i },
  { family: "Anthropic", regex: /Anthropic/i },
  { family: "GoogleAI", regex: /Google-LLM|GoogleAI|GoogleBot/i },
  { family: "GenericAI", regex: /\b(?:AI|Bot)\b/i },
];

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;
  const ip = request.headers.get("x-forwarded-for") || "";

  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (!match) return NextResponse.next();

  const ipHash = await hashIp(ip);
  const ts = Math.floor(Date.now() / 1000);

  const payload = {
    ts,
    siteId: url.hostname,
    llmFamily: match.family,
    path,
    ipHash,
    userAgent: ua,
  };

  const postUrl = process.env.LAMBDA_PROXY_URL;
  if (!postUrl) {
    console.warn('[MIDDLEWARE] LAMBDA_PROXY_URL environment variable is not set');
    return NextResponse.next();
  }

  try {
    const response = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[MIDDLEWARE] ❌ POST failed with status", response.status, "→", text);
    }
  } catch (err) {
    console.error("[MIDDLEWARE] ❌ POST to Lambda proxy failed:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};

















