// index.mjs  – Lambda Function URL for Vercel → ClickHouse Cloud
// Runtime: nodejs18.x or nodejs22.x (both include global fetch)

export const handler = async (event) => {
  console.log("[LAMBDA] Raw event:", JSON.stringify(event));

  try {
    // Body is a string from Function URL, object from console test
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};

    const { ts, siteId, llmFamily, path, ipHash, userAgent } = body;
    console.log("[LAMBDA] Parsed payload:", body);

    // ── timestamp → "YYYY-MM-DD HH:MM:SS" ───────────────────────────────
    const dt = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
    if (Number.isNaN(dt.getTime()))
      return { statusCode: 400, body: "invalid ts" };
    const iso = dt.toISOString().replace("T", " ").split(".")[0];

    // ── build SQL ───────────────────────────────────────────────────────
    const sql = `
INSERT INTO default.llm_hits
  (ts, site_id, llm_family, path, ip_hash, user_agent)
VALUES
  ('${iso}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}', '${userAgent}');
`;

    // ── ClickHouse Cloud creds ─────────────────────────────────────────
    const url  = process.env.CLICKHOUSE_HTTP_URL ?? process.env.CLICKHOUSE_URL;
    const user = process.env.CLICKHOUSE_USER;
    const pass = process.env.CLICKHOUSE_PASSWORD;
    if (!url || !user || !pass) throw new Error("missing ClickHouse env vars");
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    // ── POST the SQL (native fetch) ────────────────────────────────────
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickHouse ${res.status}: ${text}`);
    }

    console.log("[LAMBDA] ✅ Insert OK", res.status);
    return { statusCode: 200, body: JSON.stringify({ status: "inserted" }) };
  } catch (err) {
    console.error("[LAMBDA] ❌", err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message ?? "insert failed" }),
    };
  }
};


