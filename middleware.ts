/*  src/middleware.ts  – Edge runtime (Next 15+)  */
import { NextResponse, type NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────
 * 1.  Known LLM UA signatures                                  *
 * ──────────────────────────────────────────────────────────── */
type LlmSig = { family: string; regex: RegExp };

const LLM_SIGNATURES: LlmSig[] = [
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

/* ──────────────────────────────────────────────────────────────
 * 2.  SHA-256 helper                                           *
 * ──────────────────────────────────────────────────────────── */
async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ──────────────────────────────────────────────────────────────
 * 3.  Edge middleware                                          *
 * ──────────────────────────────────────────────────────────── */
export async function middleware(req: NextRequest) {
  const t0         = Date.now();
  const uaFull     = req.headers.get('user-agent')   ?? '';
  const referrer   = req.headers.get('referer')      ?? '';
  const ipRaw      = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const { hostname, pathname, search } = new URL(req.url);

  const sig = LLM_SIGNATURES.find(
    (s: LlmSig) => s.regex.test(uaFull)
  );                                                // ← typed callback
  if (!sig) return NextResponse.next();             // not a crawler → pass through

  const llmVersion = uaFull.match(/\/([\d.]+)/)?.[1] ?? '';
  const deviceType = 'bot';                         // hard-coded for now

  const payload = {
    ts         : Math.floor(Date.now() / 1000),
    siteId     : hostname,
    fullUrl    : req.url,
    path       : pathname + search,
    method     : req.method,
    referrer,
    llmFamily  : sig.family,
    llmVersion,
    device_type: deviceType,
    ip         : ipRaw,
    ipHash     : await hashIp(ipRaw),
    userAgent  : uaFull,
    respMs     : 0,
  };

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

  const res = NextResponse.next();
  res.headers.set('x-llm-family', sig.family);
  return res;
}

/* ──────────────────────────────────────────────────────────────
 * 4.  Match every route except asset files                     *
 * ──────────────────────────────────────────────────────────── */
export const config = {
  matcher: ['/', '/((?!_next|favicon.ico).*)'],
};


