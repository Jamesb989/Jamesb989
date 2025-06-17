// src/middleware.ts  – Edge runtime (Next 15+)
import { NextResponse, type NextRequest } from 'next/server';

/* ────────────────────────────────────────────────────────────── *
 * 1. Signature map                                              *
 * ────────────────────────────────────────────────────────────── */
const LLM_SIGNATURES: { family: string; regex: RegExp }[] = [
  { family: 'Claude',     regex: /Claude(?:Bot)?/i },
  { family: 'ChatGPT',    regex: /ChatGPT/i },
  { family: 'Grok',       regex: /Grok/i },
  { family: 'Perplexity', regex: /Perplexity|pJsonScraper/i },
  { family: 'BingAI',     regex: /BingPreview|BingAI|Bingbot|MS Search|msnbot/i },
  { family: 'Gemini',     regex: /Gemini|Google-Extended|Google-LLM/i },
  { family: 'Anthropic',  regex: /Anthropic/i },
  { family: 'GoogleAI',   regex: /Google-LLM|GoogleAI|GoogleBot/i },
  { family: 'GenericAI',  regex: /\b(?:AI|Bot)\b/i },
];

/* ────────────────────────────────────────────────────────────── *
 * 2. SHA-256 helper                                             *
 * ────────────────────────────────────────────────────────────── */
async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ip),
  );
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ────────────────────────────────────────────────────────────── *
 * 3. Middleware                                                 *
 * ────────────────────────────────────────────────────────────── */
export async function middleware(req: NextRequest) {
  // ── basic request details ────────────────────────────────
  const t0       = Date.now();
  const uaFull   = req.headers.get('user-agent')   ?? '';
  const referrer = req.headers.get('referer')      ?? '';
  const ipRaw    = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const { hostname, pathname, search } = new URL(req.url);

  // ── detect LLM crawler ───────────────────────────────────
  const sig = LLM_SIGNATURES.find(({ regex }) => regex.test(uaFull));
  if (!sig) return NextResponse.next();            // pass-through for humans/browsers

  // optional version e.g. “Claude/2.3”
  const llmVersion = uaFull.match(/\/([\d.]+)/)?.[1] ?? '';

  // ── assemble payload ─────────────────────────────────────
  const payload = {
    ts         : Math.floor(Date.now() / 1000),
    siteId     : hostname,
    fullUrl    : req.url,
    path       : pathname + search,
    method     : req.method,
    referrer,
    llmFamily  : sig.family,
    llmVersion,
    ip         : ipRaw,                  // raw IP → geo-lookup in Lambda
    ipHash     : await hashIp(ipRaw),
    userAgent  : uaFull,
    respMs     : 0,                      // placeholder; filled after POST returns
  };

  // ── fire-and-forget POST to Lambda ───────────────────────
  const proxyURL =
    process.env.LAMBDA_PROXY_URL ??
    'https://kbr5uzx2ugwjj2vrzkkjrgp5mm0fwkws.lambda-url.us-east-2.on.aws/';

  fetch(proxyURL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  })
    .then(async res => {
      payload.respMs = Date.now() - t0;            // round-trip latency
      if (!res.ok) console.error('[MW] Lambda HTTP', res.status, await res.text());
    })
    .catch(err => console.error('[MW] Lambda POST error', err));

  // ── continue to origin ───────────────────────────────────
  const res = NextResponse.next();
  res.headers.set('x-llm-family', sig.family);
  return res;
}

/* ────────────────────────────────────────────────────────────── *
 * 4. Match every page except static assets & favicon            *
 * ────────────────────────────────────────────────────────────── */
export const config = {
  matcher: ['/', '/((?!_next|favicon.ico).*)'],
};
