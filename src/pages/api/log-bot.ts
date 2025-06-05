// src/pages/api/log-bot.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { Kafka } from 'kafkajs';
import crypto from 'node:crypto';

// Initialize Kafka producer
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER!],
  ssl: false,
  sasl: process.env.KAFKA_USER
    ? { mechanism: 'plain', username: process.env.KAFKA_USER!, password: process.env.KAFKA_PASS! }
    : undefined,
});
const producer = kafka.producer();
let isConnected = false;

async function ensureProducerConnected() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // Method Not Allowed if not POST
  }

  const { ts, siteId, llmFamily, path, ip } = req.body as {
    ts: number;
    siteId: string;
    llmFamily: string;
    path: string;
    ip: string;
  };

  // Hash the IP (with salt)
  const ipHash = crypto
    .createHash('sha256')
    .update(ip + (process.env.SALT ?? ''))
    .digest('hex');

  await ensureProducerConnected();
  await producer.send({
    topic: 'llm_hits',
    messages: [
      { value: JSON.stringify({ ts, siteId, llmFamily, path, ipHash }) },
    ],
  });

  res.status(200).end('ok');
}
