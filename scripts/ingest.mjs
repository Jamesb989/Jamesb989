#!/usr/bin/env node
// scripts/ingest.mjs  – Kafka ➜ ClickHouse Cloud
//
// Usage:
//   $ export $(cat .env.production | xargs)   # or set vars manually
//   $ node scripts/ingest.mjs

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.production" });

import { Kafka } from "kafkajs";
import https from "https";
import { Buffer } from "buffer";

// ── env-vars check ──────────────────────────────────────────
const need = [
  "KAFKA_BROKER",
  "KAFKA_TOPIC",
  "KAFKA_USER",
  "KAFKA_PASS",
  "CLICKHOUSE_URL",
  "CLICKHOUSE_USER",
  "CLICKHOUSE_PASSWORD",
];
for (const k of need) if (!process.env[k]) throw new Error(`Missing ${k}`);

// ── HTTPS agent for ClickHouse Cloud TLS 1.2+ ───────────────
const httpsAgent = new https.Agent({
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  servername: new URL(process.env.CLICKHOUSE_URL).hostname,
});

// ── Kafka client / consumer ─────────────────────────────────
const kafka = new Kafka({
  clientId: "llm-ingest",
  brokers: process.env.KAFKA_BROKER.split(",").map((s) => s.trim()),
  ssl: true,
  sasl: {
    mechanism: "scram-sha-256",
    username: process.env.KAFKA_USER,
    password: process.env.KAFKA_PASS,
  },
});

const consumer = kafka.consumer({ groupId: "llm-analytics-group" });
await consumer.connect();
await consumer.subscribe({ topic: process.env.KAFKA_TOPIC, fromBeginning: true });
console.log("⏳  llm-ingest connected — waiting for messages…");

// ── helper: insert one row via HTTP POST ────────────────────
async function insertRow(row) {
  const payload =
    "INSERT INTO llm_hits FORMAT JSONEachRow\n" + JSON.stringify(row) + "\n";

  const auth = Buffer.from(
    `${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`
  ).toString("base64");

  const res = await fetch(process.env.CLICKHOUSE_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "text/plain",
    },
    body: payload,
    agent: httpsAgent,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

// ── main loop ───────────────────────────────────────────────
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    const raw = message.value.toString();
    console.log("🟡 Kafka message:", raw);

    let evt;
    try {
      evt = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parse error:", err.message);
      return;
    }

    // timestamp → "YYYY-MM-DD HH:MM:SS"
    const d = new Date(typeof evt.ts === "number" ? evt.ts * 1000 : evt.ts);
    if (Number.isNaN(d.getTime())) {
      console.warn("❌ bad ts:", evt.ts);
      return;
    }
    const tsSQL = d.toISOString().replace("T", " ").split(".")[0];

    const row = {
      ts: tsSQL,
      site_id: evt.siteId ?? null,
      llm_family: evt.llmFamily ?? null,
      path: evt.path ?? null,
      ip_hash: evt.ipHash ?? null,
      user_agent: evt.userAgent ?? null,
    };

    try {
      await insertRow(row);
      await consumer.commitOffsets([
        { topic, partition, offset: (Number(message.offset) + 1).toString() },
      ]);
      console.log(`✅ inserted ${row.llm_family || "[unknown]"} at ${row.ts}`);
    } catch (err) {
      console.error("❌ ClickHouse insert failed:", err.message);
    }
  },
});

// ── graceful shutdown ───────────────────────────────────────
async function bye() {
  console.log("\n⏹  Shutting down…");
  await consumer.disconnect().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", bye);
process.on("SIGTERM", bye);

