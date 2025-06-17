/*  middleware.ts – Edge runtime (Next.js 15+)  */
/*  Captures LLM crawler hits and ships them to Lambda ➜ ClickHouse  */

import { NextResponse, type NextRequest } from 'next/server';

/* ───────────────────────────── 1. Signature map ─────────────────────────── */
type LlmSig = { family: string; regex: RegExp };

const LLM_SIGNATURES: LlmSig[] = [
  { family: 'Claude',     regex: /Claude(?:Bot)?(?:\/[\d.]+)?/i },
  { family: 'ChatGPT',    regex: /ChatGPT|OpenAI\/|GPTBot/i },
  { family: 'Grok',       regex: /Grok/i },
  { family: 'Perplexity', regex: /Perplexity|pJsonScraper/i },
  { family: 'BingAI',     regex: /BingPreview|BingAI|Bingbot|MS Search|msnbot/i },
  { family: 'Gemini',     regex: /Google-Extended|Google-LLM|Gemini|GoogleAI/i },
  { family: 'Anthropic',  regex: /Anthropic/i },
  { family: 'GoogleAI',   regex: /Google-LLM|GoogleAI|GoogleBot/i },
  { family: 'GenericAI',  regex: /\b(?:AI|Bot)\b/i },          // fallback
];

/* ───────────────────────────── 2. Hash helper ───────────────────────────── */
async function hashIp(ip: string): Promise<string> {
  const raw = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', raw);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ───────────────────────────── 3. Middleware ────────────────────────────── */
export async function middleware(req: NextRequest) {
  /* 3-a. Basic request facts */
  const uaFull   = req.headers.get('user-agent') ?? '';
  const referrer = req.headers.get('referer')    ?? '';

  /* Grab the last non-empty IP in X-Forwarded-For or fall back to req.ip */
  const xfwd = (req.headers.get('x-forwarded-for') ?? '')
                 .split(',').map(s => s.trim()).filter(Boolean);
  const ipRaw = xfwd.reverse()[0] ?? '';

  const { hostname, pathname, search } = new URL(req.url);

  /* 3-b. Detect LLM */
  const sig = LLM_SIGNATURES.find(s => s.regex.test(uaFull));
  if (!sig) return NextResponse.next();             // not an LLM → skip

  const llmVersion = uaFull.match(/\/([\d.]+)/)?.[1] ?? '';

  /* 3-c. Compose payload */
  const payload = {
    ts          : Math.floor(Date.now() / 1000),    // epoch-seconds
    siteId      : hostname,
    fullUrl     : req.url,
    path        : pathname + search,
    method      : req.method,
    referrer,
    llmFamily   : sig.family,
    llmVersion,
    device_type : 'bot',
    ip          : ipRaw,
    ipHash      : await hashIp(ipRaw),
    userAgent   : uaFull,
    respMs      : 0,                                // filled after POST
  };

  /* 3-d. Fire-and-forget to Lambda */
  const proxyURL =
    process.env.LAMBDA_PROXY_URL ??
    'https://kbr5uzx2ugwjj2vrzkkjrgp5mm0fwkws.lambda-url.us-east-2.on.aws/';

  const tSend = Date.now();
  fetch(proxyURL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  })
    .then(() => { payload.respMs = Date.now() - tSend; })
    .catch(err => console.error('[MW] Lambda POST error', err));

  /* Optional console debug (remove in prod) */
  console.log('[MW] LLM hit →', sig.family, uaFull);

  /* 3-e. Continue on to your Next.js route */
  const res = NextResponse.next();
  res.headers.set('x-llm-family', sig.family);      // exposed for debugging
  return res;
}

/* ───────────────────────────── 4. Matcher ──────────────────────────────── */
export const config = {
  matcher: ['/', '/((?!_next|favicon\\.ico).*)'],   // root + every path
};




