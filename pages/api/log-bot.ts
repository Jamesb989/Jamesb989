import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@clickhouse/client'

const client = createClient({
  host: process.env.CLICKHOUSE_HTTP_URL!,
  username: process.env.CLICKHOUSE_USER!,
  password: process.env.CLICKHOUSE_PASSWORD!,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' })

  const { ts, siteId, llmFamily, path, ipHash } = req.body

  let formattedTs: string
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
    if (isNaN(date.getTime())) throw new Error()
    formattedTs = date.toISOString().replace('T', ' ').split('.')[0]
  } catch {
    return res.status(400).json({ error: 'Invalid timestamp' })
  }

  try {
    await client.insert({
      table: 'default.llm_hits',
      values: [
        {
          ts: formattedTs,
          site_id: siteId,
          llm_family: llmFamily,
          path,
          ip_hash: ipHash,
        },
      ],
      format: 'JSONEachRow',
    })
    return res.status(200).json({ status: 'inserted' })
  } catch (err) {
    console.error('[INSERT ERROR]', err)
    return res.status(502).json({ error: 'ClickHouse insert failed' })
  }
}

