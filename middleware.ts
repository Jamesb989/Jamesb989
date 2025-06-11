import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  console.log(`[EDGE] UA: ${ua} | PATH: ${url.pathname} | METHOD: ${request.method}`);
  return NextResponse.next();
}




