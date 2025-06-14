// pages/api/log-bot.ts
import { NextApiRequest, NextApiResponse } from 'next'

async function insertToClickHouse(sql: string, maxAttempts = 3): Promise<void> {
  const url = process.env.CLICKHOUSE_HTTP_URL!
  const auth = 'Basic ' + Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64')
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'text/plain' },
        body: sql,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      return
    } catch (err) {
      console.error(`[INSERT][Attempt ${i}]`, err)
      if (i === maxAttempts) throw err
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (process.env.NODE_ENV !== 'production') {
    console.log('👷 Dev mode: skipping CH insert', req.body)
    return res.status(200).json({ status: 'dev-skip' })
  }
  try {
    const { ts, siteId, llmFamily, path, ipHash, userAgent } = req.body
    const date = (typeof ts === 'number') ? new Date(ts * 1000) : new Date(ts)
    if (isNaN(date.getTime())) throw new Error('Invalid ts')
    const formatted = date.toISOString().replace('T', ' ').split('.')[0]
    const sql = `INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash, user_agent) VALUES ('${formatted}','${siteId}','${llmFamily}','${path}','${ipHash}','${userAgent}')`
    await insertToClickHouse(sql)
    res.status(200).json({ status: 'inserted' })
  } catch (err) {
    console.error('[API] Insert failed', err)
    res.status(502).json({ error: 'ClickHouse insert failed', details: String(err) })
  }
}






