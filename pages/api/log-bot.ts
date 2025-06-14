import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import fetch from 'node-fetch';

const agent = new https.Agent({ keepAlive: true });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ts, siteId, llmFamily, path, ipHash } = req.body;

  const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }
  const formattedTs = date.toISOString().replace('T', ' ').split('.')[0];

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${formattedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  try {
    const chRes = await fetch(process.env.CLICKHOUSE_HTTP_URL!, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64'),
        'Content-Type': 'text/plain',
      },
      body: sql,
      agent,
    });

    if (!chRes.ok) {
      const text = await chRes.text();
      console.error('[ClickHouse Error]', text);
      return res.status(502).json({ error: 'ClickHouse insert failed' });
    }

    return res.status(200).json({ status: 'inserted' });
  } catch (err) {
    console.error('[INSERT ERROR]', err);
    return res.status(502).json({ error: 'ClickHouse insert failed' });
  }
}





