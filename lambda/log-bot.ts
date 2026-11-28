import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  servername: new URL(process.env.CLICKHOUSE_HTTP_URL!).hostname,
});

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { ts, siteId, llmFamily, path, ipHash } = body;

    const parsedTs = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(parsedTs.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid timestamp' }),
      };
    }

    const sql = `
      INSERT INTO default.llm_hits (ts, site_id, llm_family, path, ip_hash)
      VALUES ('${parsedTs.toISOString().replace('T', ' ').split('.')[0]}', '${siteId}', '${llmFamily}', '${path}', '${ipHash}')
    `;

    const auth = Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64');

    await axios.post(process.env.CLICKHOUSE_HTTP_URL!, sql, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'text/plain',
      },
      httpsAgent,
      timeout: 5000,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'inserted' }),
    };
  } catch (err: any) {
    console.error('[LAMBDA ERROR]', err.message, err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy request failed', details: err.message }),
    };
  }
};
