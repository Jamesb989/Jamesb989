import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import https from 'https'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ts, siteId, llmFamily, path, ipHash, userAgent } = req.body

  const parsedTs = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  if (isNaN(parsedTs.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp' })
  }

  const sql = `
    INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash, user_agent)
    VALUES ('${parsedTs.toISOString().replace('T', ' ').split('.')[0]}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}', '${userAgent}')
  `

  try {
    await axios.post(
      process.env.LAMBDA_PROXY_URL!,
      { sql },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        httpsAgent: new https.Agent({ keepAlive: true })
      }
    )
    res.status(200).json({ status: 'inserted' })
  } catch (err: any) {
    console.error('[INSERT ERROR]', err)
    res.status(502).json({ error: 'Proxy request failed', details: err.message })
  }
}
















