// middleware.ts (place at your project root)

import { NextResponse, type NextRequest } from "next/server";

// This matcher ensures the middleware runs on ALL routes (except _next/static by default)
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

export async function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const path = req.nextUrl.pathname;
  const method = req.method;

  // Log EVERY incoming request for full monitoring (GET, POST, etc)
  console.log(`[Edge] INCOMING ${method} | UA: ${ua} | PATH: ${path}`);

  // (Put any bot detection, analytics, or POST-to-API logic here)

  return NextResponse.next();
}



