import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const response = await axios.post(
      'https://kbr5uzx2ugwjj2vrzkkjrgp5mm0fwkws.lambda-url.us-east-2.on.aws/',
      req.body,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (response.status !== 200) {
      return res.status(502).json({ error: 'Proxy insert failed', lambdaStatus: response.status, lambdaBody: response.data })
    }

    return res.status(200).json({ status: 'queued' })
  } catch (err: any) {
    console.error('[PROXY ERROR]', err)
    return res.status(502).json({ error: 'Proxy request failed', details: err.message })
  }
}











