// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  console.log('[TEST-MIDDLEWARE] ✅ Middleware was triggered!');
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
