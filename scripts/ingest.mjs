// scripts/ingest.mjs  – Kafka → ClickHouse consumer
//
// Usage:
//   $ export $(cat .env.local | xargs)   # or set env vars manually
//   $ node scripts/ingest.mjs

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.production' });

import { Kafka } from 'kafkajs';
import { createClient } from '@clickhouse/client';

// ────────────────────────────────────────────────────────────
// Validate required environment variables
// ────────────────────────────────────────────────────────────
const required = [
  'KAFKA_BROKER',
  'KAFKA_TOPIC',
  'KAFKA_USER',
  'KAFKA_PASS',
  'CLICKHOUSE_HOST',
  'CLICKHOUSE_USER',
  'CLICKHOUSE_PASSWORD',
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

// ────────────────────────────────────────────────────────────
// ClickHouse client
// ────────────────────────────────────────────────────────────
const ch = createClient({
  url: process.env.CLICKHOUSE_HOST,          // e.g. https://ch.example.com:8443
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  clickhouse_settings: { async_insert: 1 },
});

// ────────────────────────────────────────────────────────────
// Kafka consumer
// ────────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'llm-ingest',
  brokers: process.env.KAFKA_BROKER.split(',').map(s => s.trim()),
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',              // adjust if your cluster uses -512
    username: process.env.KAFKA_USER,
    password: process.env.KAFKA_PASS,
  },
  connectionTimeout: 10000,                  // 10 s TCP connect
  requestTimeout:    30000,                  // 30 s API call
});

const consumer = kafka.consumer({ groupId: 'llm-analytics-group' });

await consumer.connect();
await consumer.subscribe({ topic: process.env.KAFKA_TOPIC, fromBeginning: false });

console.log('⏳  llm‑ingest connected — waiting for messages…');

await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    const evt = JSON.parse(message.value.toString());
    // evt: { ts: <epoch‑ms>, siteId, llmFamily, path, ipHash }

    const row = {
      ts:         (evt.ts / 1000).toFixed(3),  // DateTime64(3) seconds.ms
      site_id:    evt.siteId,
      llm_family: evt.llmFamily,
      path:       evt.path,
      ip_hash:    evt.ipHash,
    };

    try {
      await ch.insert({
        table:  'llm_hits',
        values: [row],
        format: 'JSONEachRow',
      });

      await consumer.commitOffsets([
        { topic, partition, offset: (Number(message.offset) + 1).toString() },
      ]);
      console.log('✅ inserted', row.llm_family, row.path);
    } catch (err) {
      console.error('❌ ClickHouse insert failed — will retry:', err);
      throw err; // cause re‑delivery
    }
  },
});

// graceful shutdown
const shutdown = async () => {
  console.log('\n⏹  Shutting down…');
  await consumer.disconnect().catch(() => {});
  await ch.close().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

