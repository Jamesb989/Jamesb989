import { NextResponse } from "next/server";
import crypto from "crypto";

// List of detectable LLM signatures
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

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;
  const ip = request.headers.get("x-forwarded-for") || "";

  // Skip internal Next.js assets
  if (path.startsWith("/_next")) return NextResponse.next();

  console.log(`[EDGE] UA: ${ua} | PATH: ${path} | METHOD: ${request.method}`);

  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (match) {
    const payload = {
      ts: new Date().toISOString().replace('T', ' ').split('.')[0],
      siteId: url.hostname,
      llmFamily: match.family,
      path,
      ipHash: hashIp(ip),
      userAgent: ua,
    };

    console.log(`[EDGE-LLM-MATCH] Queuing:`, payload);

    fetch(`${url.origin}/api/log-bot`, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error(`[EDGE] Failed to POST to /api/log-bot`, err);
    });
  }

  return NextResponse.next();
}


