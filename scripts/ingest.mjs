// scripts/ingest.mjs

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { Kafka } from 'kafkajs';
import { createClient } from '@clickhouse/client';
import crypto from 'crypto';

// 1. Configure local ClickHouse client
const ch = createClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  clickhouse_settings: { async_insert: 1 }
});

// 2. Configure KafkaJS consumer
if (!process.env.KAFKA_BROKER) {
  throw new Error('Missing KAFKA_BROKER in .env.local');
}
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  ssl: false,
  sasl: process.env.KAFKA_USER
    ? { mechanism: 'plain', username: process.env.KAFKA_USER, password: process.env.KAFKA_PASS }
    : undefined
});
const consumer = kafka.consumer({ groupId: 'llm-analytics-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'llm_hits', fromBeginning: false });

console.log('⏳  waiting for messages…');

await consumer.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());

    // evt has shape: { ts: <number>, siteId: <string>, llmFamily: <string>, path: <string>, ip: <string> }
    // We need to turn that into the ClickHouse row with snake_case columns:
    //   ts, site_id, llm_family, path, ip_hash

    // Compute SHA-256 hex of the IP (optionally salted)
    // If you want to salt, you can do: evt.ip + process.env.SALT
    const rawIp = evt.ip || '';
    const hasher = crypto.createHash('sha256');
// ingest.mjs
import { Kafka } from "kafkajs";
import { ClickHouse } from "@clickhouse/client";
import crypto from "node:crypto";

const kafka   = new Kafka({ clientId: "llm-ingest", brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: "llm_ingest_group" });
await consumer.connect();
await consumer.subscribe({ topic: "llm_hits", fromBeginning: false });

const ch = new ClickHouse({
  host:     process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DB || "default",
});

await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    const evt = JSON.parse(message.value.toString());

    // sha-256(IP + SALT) *again* is optional – usually done in middleware already
    const ipHashHex = crypto
      .createHash("sha256")
      .update(evt.ip + (process.env.SALT || ""))
      .digest("hex");

    const row = {
      ts:        (evt.ts / 1000).toFixed(3),   // DateTime64(3)
      site_id:   evt.siteId,
      llm_family: evt.llmFamily,
      path:      evt.path,
      ip_hash:   ipHashHex,
    };

    try {
      await ch.insert({
        table:  "llm_hits",
        values: [row],
        format: "JSONEachRow",
      });

      // commit offset only after insert succeeds
      await consumer.commitOffsets([
        { topic, partition, offset: (Number(message.offset) + 1).toString() },
      ]);
      console.log("✅ inserted", row.llm_family, row.path);
    } catch (err) {
      console.error("❌ ClickHouse insert failed:", err);
      // let the error bubble – Kafka will retry later
      throw err;
    }
  },
});

process.on("SIGINT", async () => {
  await consumer.disconnect();
  await ch.close();
  process.exit(0);
});









