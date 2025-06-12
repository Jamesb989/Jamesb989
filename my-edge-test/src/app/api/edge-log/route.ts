import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Here, just log to serverless console, but you can also save to DB, S3, etc
  console.log("[EDGE-REMOTE-LOG]", body);
  return NextResponse.json({ status: "ok" });
}
