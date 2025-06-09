import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@clickhouse/client";

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST!,
  username: process.env.CLICKHOUSE_USER!,
  password: process.env.CLICKHOUSE_PASSWORD!,
  // If using self-signed certificates, you can enable TLS options:
  // tls: { rejectUnauthorized: false },
});

export async function POST(request: NextRequest) {
  try {
    const { ts, siteId, llmFamily, path, ipHash } = await request.json();

    // Insert directly into the MergeTree table using JSONEachRow format
    await clickhouse.insert({
      table: "default.llm_hits",
      format: "JSONEachRow",
      values: [
        { ts, site_id: siteId, llm_family: llmFamily, path, ip_hash: ipHash }
      ],
    });

    return NextResponse.json({ status: "logged" }, { status: 200 });
  } catch (error) {
    console.error("Error logging to ClickHouse:", error);
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to log LLM hits" }, { status: 200 });
}





