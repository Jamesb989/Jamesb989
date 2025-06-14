import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { ts, siteId, llmFamily, path, ipHash } = req.body;
  if (!ts || !siteId || !llmFamily || !path || !ipHash) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  let parsedTs: string;
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) throw new Error();
    parsedTs = date.toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${parsedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  try {
    const clickhouseRes = await fetch(process.env.CLICKHOUSE_HTTP_URL!, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64'),
      },
      body: sql,
    });

    if (!clickhouseRes.ok) throw new Error(await clickhouseRes.text());
    return res.status(200).json({ status: 'inserted' });
  } catch (err) {
    console.error('[INSERT ERROR]', err);
    return res.status(502).json({ error: 'ClickHouse insert failed' });
  }
}





