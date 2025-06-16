// scripts/ingest.mjs – Kafka → ClickHouse via HTTP
//
// Usage:
//   $ export $(cat .env.production | xargs)
//   $ node scripts/ingest.mjs

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.production' });

import { Kafka } from 'kafkajs';
import https from 'https';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

// ────────────────────────────────────────────────────────────
// Validate required environment variables
// ────────────────────────────────────────────────────────────
const required = [
  'KAFKA_BROKER',
  'KAFKA_TOPIC',
  'KAFKA_USER',
  'KAFKA_PASS',
  'CLICKHOUSE_URL',
  'CLICKHOUSE_USER',
  'CLICKHOUSE_PASSWORD',
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

// ────────────────────────────────────────────────────────────
// HTTPS agent for ClickHouse Cloud
// ────────────────────────────────────────────────────────────
const httpsAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  servername: new URL(process.env.CLICKHOUSE_URL).hostname,
});

// ────────────────────────────────────────────────────────────
// Kafka consumer setup
// ────────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'llm-ingest',
  brokers: process.env.KAFKA_BROKER.split(',').map(s => s.trim()),
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USER,
    password: process.env.KAFKA_PASS,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000,
});

const consumer = kafka.consumer({ groupId: 'llm-analytics-group' });

await consumer.connect();
await consumer.subscribe({
  topic: process.env.KAFKA_TOPIC,
  fromBeginning: true,
});

console.log('⏳  llm‑ingest connected — waiting for messages…');

// ────────────────────────────────────────────────────────────
// Insert row into ClickHouse via HTTP
// ────────────────────────────────────────────────────────────
async function insertRowHTTP(row) {
  const payload = `INSERT INTO llm_hits FORMAT JSONEachRow\n${JSON.stringify(row)}\n`;

  const res = await fetch(process.env.CLICKHOUSE_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`
      ).toString('base64'),
      'Content-Type': 'application/json',
    },
    agent: httpsAgent,
    body: payload,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }
}

// ────────────────────────────────────────────────────────────
// Kafka message handler
// ────────────────────────────────────────────────────────────
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    const raw = message.value.toString();
    console.log('🟡 Raw Kafka message:', raw);

    let evt;
    try {
      evt = JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Failed to parse message at offset ${message.offset}:`, err.message);
      return;
    }

    let timestamp;
    try {
      const d = new Date(evt.ts);
      if (isNaN(d.getTime())) throw new Error('Invalid date');
      timestamp = d.toISOString().replace('T', ' ').split('.')[0];
    } catch {
      console.error(`❌ Skipping invalid timestamp at offset ${message.offset}:`, evt.ts);
      return;
    }

    const row = {
      ts: timestamp,
      site_id: evt.siteId || null,
      llm_family: evt.llmFamily || null,
      path: evt.path || null,
      ip_hash: evt.ipHash || null,
      user_agent: evt.userAgent || null,
    };

    try {
      await insertRowHTTP(row);
      await consumer.commitOffsets([
        { topic, partition, offset: (Number(message.offset) + 1).toString() },
      ]);

      console.log(`✅ inserted ${row.llm_family || '[unknown]'} at ${row.ts}`);
    } catch (err) {
      console.error(`❌ ClickHouse insert failed @ offset ${message.offset}:`, err.message);
    }
  },
});

// ────────────────────────────────────────────────────────────
// Graceful shutdown
// ────────────────────────────────────────────────────────────
const shutdown = async () => {
  console.log('\n⏹  Shutting down…');
  await consumer.disconnect().catch(() => {});
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

