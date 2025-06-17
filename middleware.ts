/*  middleware.ts – Edge runtime (Next.js 15+)  */
/*  Logs every LLM crawler hit → AWS Lambda → ClickHouse                    */

import { NextResponse, type NextRequest } from 'next/server';

/* ────────────────────── 1 · Signature map ───────────────────── */
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
  { family: 'GenericAI',  regex: /\b(?:AI|Bot)\b/i },                // fallback
];

/* ────────────────────── 2 · Hash helper ─────────────────────── */
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ────────────────────── 3 · Middleware ──────────────────────── */
export async function middleware(req: NextRequest) {
  /* 3-a · basic facts */
  const uaFull    = req.headers.get('user-agent')        ?? '';
  const referrer  = req.headers.get('referer')           ?? '';

  /* best-effort real IP (CF > x-real-ip > first XFF) */
  const ipRaw =
        req.headers.get('cf-connecting-ip') ??
        req.headers.get('x-real-ip') ??
        (req.headers.get('x-forwarded-for') ?? '')
          .split(',').map(s => s.trim()).filter(Boolean)[0] ??
        '';

  /* Vercel already geolocates; keep as cheap fallback */
  const countryHdr = req.headers.get('x-vercel-ip-country') ?? '';

  const url       = new URL(req.url);
  const hostname  = url.hostname;
  const path      = url.pathname + url.search;            // keep split-test qs

  /* 3-b · detect LLM */
  const sig = LLM_SIGNATURES.find(s => s.regex.test(uaFull));
  if (!sig) return NextResponse.next();                    // non-LLM → skip

  const llmVersion = uaFull.match(/\/([\d.]+)/)?.[1] ?? '';

  /* 3-c · payload */
  const payload = {
    ts          : Math.floor(Date.now() / 1000),           // epoch-seconds
    siteId      : hostname,
    fullUrl     : req.url,
    path,
    method      : req.method,
    referrer,
    llmFamily   : sig.family,
    llmVersion,
    device_type : 0,                                       // Enum8('bot'=0,…)
    ip          : ipRaw,
    ipHash      : await sha256Hex(ipRaw),
    country     : countryHdr,                              // may be ''
    userAgent   : uaFull,
    respMs      : 0,
  };

  /* 3-d · send → Lambda (blocking so row is committed) */
  const proxyURL =
    (process.env.LAMBDA_PROXY_URL ??
     'https://kbr5uzx2ugwjj2vrzkkjrgp5mm0fwkws.lambda-url.us-east-2.on.aws/') +
    '?wait_for_async_insert=1';

  try {
    const t0   = Date.now();
    const resp = await fetch(proxyURL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });
    payload.respMs = Date.now() - t0;
    console.log('[MW] Lambda POST →', resp.status, resp.statusText);
  } catch (err) {
    console.error('[MW] Lambda POST error', (err as Error).message);
  }

  /* 3-e · pass request onward */
  const res = NextResponse.next();
  res.headers.set('x-llm-family', sig.family);             // debug helper
  console.log('[MW] LLM hit →', sig.family, path);
  return res;
}

/* ────────────────────── 4 · Matcher ─────────────────────────── */
export const config = {
  matcher: ['/', '/((?!_next|favicon\\.ico).*)'],          // every route
};






