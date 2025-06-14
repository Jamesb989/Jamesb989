import { NextResponse } from "next/server";

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

async function hashIp(ip) {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request) {
  try {
    console.log("[MIDDLEWARE] ⚡ Middleware triggered");

    const ua = request.headers.get("user-agent") || "";
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = request.headers.get("x-forwarded-for") || "";

    console.log(`[MIDDLEWARE] UA="${ua}" | PATH="${path}"`);

    const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
    if (!match) return NextResponse.next();

    console.log(`[MIDDLEWARE] ✅ Detected LLM UA match: ${match.family}`);

    const ipHash = await hashIp(ip);
    const ts = Math.floor(Date.now() / 1000); // UNIX timestamp (seconds)
    const payload = {
      ts,
      siteId: url.hostname,
      llmFamily: match.family,
      path,
      ipHash,
      userAgent: ua,
    };

    const postUrl = "https://jamesb989-63ax-4tgq63sy4-james-projects-56d3a5d2.vercel.app/api/log-bot";

    console.log(`[EDGE] 🌍 Attempting POST to ${postUrl}`);
    console.log(`[EDGE] 📤 Payload: ${JSON.stringify(payload)}`);

    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`[EDGE] ✅ POST status: ${res.status}`);
    const text = await res.text();
    console.log(`[EDGE] ✅ Response text: ${text}`);
  } catch (err) {
    console.error("[MIDDLEWARE] ❌ Uncaught error in middleware:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};










