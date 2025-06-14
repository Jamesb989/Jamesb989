import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const required = ['CLICKHOUSE_HTTP_URL', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ error: `Missing env vars: ${missing.join(',')}` });
  }

  const { ts, siteId, llmFamily, path, ipHash } = req.body;

  let parsedTs: number;
  try {
    parsedTs = typeof ts === 'number' ? ts : Math.floor(new Date(ts).getTime() / 1000);
    if (isNaN(parsedTs)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  const sql = `
    INSERT INTO default.llm_hits_queue (ts, siteId, llmFamily, path, ipHash)
    VALUES (${parsedTs}, '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  try {
    const response = await fetch(process.env.CLICKHOUSE_HTTP_URL!, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64'),
      },
      body: sql,
    });

    if (!response.ok) throw new Error(await response.text());
    return res.status(200).json({ status: 'queued' });
  } catch (err) {
    console.error('[INSERT ERROR]', err);
    return res.status(502).json({ error: 'ClickHouse insert failed' });
  }
}
