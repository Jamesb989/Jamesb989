import { NextResponse, type NextRequest } from "next/server";

export const config = { matcher: ["/", "/:path*"] };

export async function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const path = req.nextUrl.pathname;

  // Log every incoming GET (and POST/others) for debugging
  console.log("INCOMING GET UA:", ua, "| PATH:", path);

  // (Your matching and analytics logic goes here)

  return NextResponse.next();
}


