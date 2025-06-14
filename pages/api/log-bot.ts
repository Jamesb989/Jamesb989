import { NextApiRequest, NextApiResponse } from 'next';
import fetch, { RequestInit } from 'node-fetch';
import https from 'https';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { CLICKHOUSE_HTTP_URL, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD } = process.env;
  if (!CLICKHOUSE_HTTP_URL || !CLICKHOUSE_USER || !CLICKHOUSE_PASSWORD) {
    return res.status(500).json({ error: 'Missing ClickHouse env vars' });
  }

  const { ts, siteId, llmFamily, path, ipHash } = req.body;

  let parsedTs: string;
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    parsedTs = date.toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${parsedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `;

  const agent = new https.Agent({ rejectUnauthorized: false });

  const options: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`).toString('base64'),
      'Content-Type': 'text/plain',
    },
    body: sql,
    agent,
  };

  try {
    const response = await fetch(CLICKHOUSE_HTTP_URL, options);
    if (!response.ok) throw new Error(await response.text());
    return res.status(200).json({ status: 'inserted' });
  } catch (err) {
    console.error('[INSERT ERROR]', err);
    return res.status(502).json({ error: 'ClickHouse insert failed' });
  }
}



