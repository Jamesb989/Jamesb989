import { NextResponse } from "next/server";

// Add/edit patterns here for any LLM/bot you want to track
const LLM_SIGNATURES = [
  { family: "Claude", regex: /Claude(?:Bot)?/i },
  { family: "ChatGPT", regex: /ChatGPT/i },
  { family: "Grok", regex: /Grok/i },
  { family: "Perplexity", regex: /Perplexity|pJsonScraper/i },
  { family: "BingAI", regex: /BingPreview|BingAI|Bingbot|MS Search|msnbot/i },
  { family: "Gemini", regex: /Gemini|Google-Extended|Google-LLM/i },
  { family: "Anthropic", regex: /Anthropic/i },
  { family: "GoogleAI", regex: /Google-LLM|GoogleAI|GoogleBot/i },
  // Fallback generic AI bot detection
  { family: "GenericAI", regex: /\b(?:AI|Bot)\b/i },
];

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;

  // Log every incoming request (GET/POST) for observability
  console.log(`[EDGE] UA: ${ua} | PATH: ${path} | METHOD: ${request.method}`);

  // Detect LLM bots
  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (match) {
    // Log a match (easy to grep/filter in logs)
    console.log(`[EDGE-LLM-MATCH] Family: ${match.family} | UA: ${ua} | PATH: ${path}`);

    // Fire-and-forget POST to /api/log-bot for analytics
    fetch(`${url.origin}/api/log-bot`, {
      method: "POST",
      keepalive: true, // ensures POST is sent even if client disconnects
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ts: Date.now(),
        siteId: url.hostname,
        llmFamily: match.family,
        path,
        ipHash: "", // Edge Middleware doesn't expose IP by default for privacy
        userAgent: ua,
      }),
    }).catch(() => {});
  }

  // Always continue to the next handler/page
  return NextResponse.next();
}

