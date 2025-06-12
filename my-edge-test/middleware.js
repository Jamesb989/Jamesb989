import { NextResponse } from "next/server";

// Comprehensive up-to-date LLM/AI signatures (2025)
const LLM_SIGNATURES = [
  // OpenAI & ChatGPT
  { family: "GPTBot",          regex: /GPTBot\/[0-9.]+/i },
  { family: "ChatGPT-User",    regex: /ChatGPT[-\/]?User\/[0-9.]+/i },
  { family: "OAI-SearchBot",   regex: /OAI-SearchBot\/[0-9.]+/i },
  // Anthropic & Claude
  { family: "Claude",          regex: /ClaudeBot\/[0-9.]+|claude-web\/[0-9.]+|anthropic-ai\/[0-9.]+/i },
  // Perplexity
  { family: "PerplexityBot",   regex: /PerplexityBot\/[0-9.]+|Perplexity-User\/[0-9.]+|pJsonScraper/i },
  // Mistral
  { family: "MistralAI-User",  regex: /MistralAI-User\/[0-9.]+/i },
  // Bing, Gemini, Google, Apple, Meta, Facebook
  { family: "BingAI",          regex: /BingPreview|BingAI|bingbot\/[0-9.]+|MS Search|msnbot/i },
  { family: "Gemini",          regex: /Gemini|Google-Extended\/[0-9.]+|Google-LLM/i },
  { family: "AppleBot",        regex: /Applebot(-Extended)?\/[0-9.]+/i },
  { family: "GoogleAI",        regex: /GoogleAI|GoogleBot|Google-LLM/i },
  { family: "Meta",            regex: /meta-externalagent\/[0-9.]+|FacebookBot\/[0-9.]+/i },
  // Other major players
  { family: "Cohere",          regex: /cohere-ai\/[0-9.]+/i },
  { family: "Bytespider",      regex: /Bytespider\/[0-9.]+/i },
  { family: "CCBot",           regex: /CCBot\/[0-9.]+/i },
  // Fallback generic AI/bot detection
  { family: "GenericAI",       regex: /\b(?:AI|Bot)\b/i },
];

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;

  // Log every incoming request (GET/POST) for observability
  console.log(`[EDGE] UA: ${ua} | PATH: ${path} | METHOD: ${request.method}`);

  // Detect LLM/AI bots
  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (match) {
    console.log(`[EDGE-LLM-MATCH] Family: ${match.family} | UA: ${ua} | PATH: ${path}`);
    // Fire-and-forget POST to /api/log-bot for analytics
    fetch(`${url.origin}/api/log-bot`, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ts: Date.now(),
        siteId: url.hostname,
        llmFamily: match.family,
        path,
        ipHash: "", // Edge Middleware does not expose client IP
        userAgent: ua,
      }),
    }).catch(() => {});
  }

  // Always continue to the next handler/page
  return NextResponse.next();
}


