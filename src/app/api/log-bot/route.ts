import { NextRequest, NextResponse } from 'next/server';
import { Kafka, Producer } from 'kafkajs';

declare global {
  // Re‑use across Lambda invocations
  var __llmKafkaProducer__: Producer | undefined;
}

/**
 * Return a singleton KafkaJS producer that is already connected.
 */
async function getProducer(): Promise<Producer> {
  if (globalThis.__llmKafkaProducer__) {
    return globalThis.__llmKafkaProducer__;
  }

  const kafka = new Kafka({
    clientId: 'llm-analytics',
    brokers: process.env.KAFKA_BROKER!.split(',').map(b => b.trim()),
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_USERNAME!,   // non‑null by env‑check below
      password: process.env.KAFKA_PASSWORD!,
    },
    connectionTimeout: 10_000,
    requestTimeout:    30_000,
    // clientDnsLookup removed to satisfy TypeScript  ✨
  });

  const producer = kafka.producer();
  await producer.connect();                   // connect once

  globalThis.__llmKafkaProducer__ = producer;
  return producer;
}

export async function POST(request: NextRequest) {
  const missing = ['KAFKA_BROKER', 'KAFKA_TOPIC', 'KAFKA_USERNAME', 'KAFKA_PASSWORD']
    .filter(k => !process.env[k]);
  if (missing.length) {
    return NextResponse.json(
      { status: 'error', message: `Missing env vars: ${missing.join(',')}` },
      { status: 500 },
    );
  }

  const { ts, siteId, llmFamily, path, ipHash } = await request.json();

  try {
    const producer = await getProducer();
    await producer.send({
      topic: process.env.KAFKA_TOPIC!,
      messages: [{ value: JSON.stringify({ ts, siteId, llmFamily, path, ipHash }) }],
    });
    return NextResponse.json({ status: 'queued' }, { status: 200 });
  } catch (err) {
    console.error('Kafka publish error:', err);
    return NextResponse.json(
      { status: 'error', message: 'Internal queue failure' },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to queue LLM hits' },
    { status: 200 },
  );
}
