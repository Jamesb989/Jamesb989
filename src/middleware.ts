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
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const path = url.pathname;
  const ip = request.headers.get("x-forwarded-for") || "";

  console.log("[MIDDLEWARE] 🚨 Triggered:", path, "UA:", ua);

  const match = LLM_SIGNATURES.find(({ regex }) => regex.test(ua));
  if (!match) {
    const res = NextResponse.next();
    res.headers.set("x-middleware-check", "executed");
    return res;
  }

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

  console.log("[MIDDLEWARE] 📨 Matched LLM:", match.family, "→ sending payload:", payload);

  const postUrl =
    process.env.LAMBDA_PROXY_URL ||
    "https://kbr5uzx2ugwjj2vrzkkjrgp5mm0fwkws.lambda-url.us-east-2.on.aws/";

  fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        console.error("[MIDDLEWARE] ❌ Lambda POST failed:", res.status, text);
      } else {
        console.log("[MIDDLEWARE] ✅ Lambda POST success:", res.status, text);
      }
    })
    .catch((err) => {
      console.error("[MIDDLEWARE] ❌ Lambda POST error:", err);
    });

  const res = NextResponse.next();
  res.headers.set("x-llm-family", match.family);
  res.headers.set("x-middleware-check", "executed");
  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};



















// trigger redeploy
// trigger redeploy
// redeploy trigger
