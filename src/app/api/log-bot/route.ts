import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const env = ['CLICKHOUSE_HTTP_URL', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD'];
  const missing = env.filter(k => !process.env[k]);
  if (missing.length) {
    return NextResponse.json({ error: `Missing env vars: ${missing.join(',')}` }, { status: 500 });
  }

  const { ts, siteId, llmFamily, path, ipHash } = await req.json();

  let parsedTs: string;
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) throw new Error();
    parsedTs = date.toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${parsedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  try {
    const res = await fetch(process.env.CLICKHOUSE_HTTP_URL!, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64'),
      },
      body: sql,
    });

    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ status: 'inserted' });
  } catch (err) {
    console.error('[INSERT ERROR]', err);
    return NextResponse.json({ error: 'ClickHouse insert failed' }, { status: 502 });
  }
}



