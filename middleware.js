import { NextResponse } from "next/server";
import crypto from "crypto";

const LLM_SIGNATURES = [
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

function hashIp(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function middleware(request) {
  console.log("[MIDDLEWARE] ⚡ Middleware triggered");

  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;
  const ip = request.headers.get("x-forwarded-for") || "";

  console.log(`[MIDDLEWARE] UA="${ua}" | PATH="${path}"`);

  LLM_SIGNATURES.forEach(sig => {
    if (sig.regex.test(ua)) {
      console.log(`[MIDDLEWARE] 🔎 UA matched: ${sig.family} via ${sig.regex}`);
    }
  });

  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (match) {
    console.log(`[MIDDLEWARE] ✅ Detected LLM UA match: ${match.family}`);
    const payload = {
      ts: new Date().toISOString().replace("T", " ").split(".")[0],
      siteId: url.hostname,
      llmFamily: match.family,
      path,
      ipHash: hashIp(ip),
      userAgent: ua,
    };

    console.log("[EDGE] 🌍 Posting to /api/log-bot with payload:", payload);

    try {
      const res = await fetch("/api/log-bot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log(`[EDGE] ✅ POST status: ${res.status}`);
      console.log(`[EDGE] ✅ Response text: ${text}`);
    } catch (err) {
      console.error("[EDGE] ❌ POST failed:", err.message || err);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};

