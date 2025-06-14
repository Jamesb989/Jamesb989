import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ts, siteId, llmFamily, path, ipHash, userAgent } = req.body;

  if (!ts || !siteId || !llmFamily || !path || !ipHash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let formattedTs: string;
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) throw new Error('Invalid timestamp');
    formattedTs = date.toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp format' });
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${formattedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  try {
    const url = process.env.CLICKHOUSE_HTTP_URL!;
    const user = process.env.CLICKHOUSE_USER!;
    const pass = process.env.CLICKHOUSE_PASSWORD!;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
        'Content-Type': 'text/plain',
      },
      body: sql,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    res.status(200).json({ status: 'queued' });
  } catch (err: any) {
    console.error('[INSERT ERROR]', err);
    res.status(502).json({ error: 'ClickHouse insert failed', details: err.message });
  }
}








