import { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import https from 'https'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ts, siteId, llmFamily, path, ipHash } = req.body

  let parsedTs: string
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
    if (isNaN(date.getTime())) throw new Error('Invalid timestamp')
    parsedTs = date.toISOString().replace('T', ' ').split('.')[0] // e.g., '2025-06-14 01:25:00'
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp' })
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
    VALUES ('${parsedTs}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
  `

  try {
    await axios.post(
      process.env.CLICKHOUSE_HTTP_URL!,
      sql,
      {
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64')
        },
        httpsAgent: new https.Agent({ keepAlive: true })
      }
    )
    res.status(200).json({ status: 'inserted' })
  } catch (err: any) {
    console.error('[INSERT ERROR]', err)
    res.status(502).json({
      error: 'ClickHouse insert failed',
      details: err?.message ?? 'Unknown error'
    })
  }
}










