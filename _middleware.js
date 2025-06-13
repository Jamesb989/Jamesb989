// middleware.js
import { NextResponse } from 'next/server';

export function middleware() {
  console.log('[MIDDLEWARE] ✅ Minimal middleware triggered');
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
