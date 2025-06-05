// src/middleware.ts

import sigs from './signatures/llm.json';
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: '/:path*',
};

export async function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  console.log('🔍 [middleware] UA:', ua);

  // Find the first signature whose regex matches this User-Agent
  const sig = Object.values(sigs).find((s) =>
    new RegExp(s.regex, 'i').test(ua)
  );

  if (sig) {
    console.log(`🔔 [middleware] Detected LLM = ${sig.family}, posting to /api/log-bot`);

    // Build an absolute URL for the API route without using new URL()
    const endpointPath = process.env.LOG_ENDPOINT ?? '/api/log-bot';
    const apiUrl = `${req.nextUrl.origin}${endpointPath}`;

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ts: Date.now(),
        siteId: process.env.NEXT_PUBLIC_SITE_ID,
        llmFamily: sig.family,
        path: req.nextUrl.pathname,
        ip: req.headers.get('x-forwarded-for') ?? '',
      }),
      keepalive: true,
    });
  }

  return NextResponse.next();
}



