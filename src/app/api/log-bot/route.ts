import { NextRequest, NextResponse } from 'next/server';
import { Kafka, Producer } from 'kafkajs';

declare global {
  var __llmKafkaProducer__: Producer | undefined;
}

async function getProducer(): Promise<Producer> {
  if (globalThis.__llmKafkaProducer__) return globalThis.__llmKafkaProducer__;

  const kafka = new Kafka({
    clientId: 'llm-analytics',
    brokers: process.env.KAFKA_BROKER!.split(',').map(b => b.trim()),
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_USER!,
      password: process.env.KAFKA_PASS!,
    },
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
  });

  const producer = kafka.producer();
  await producer.connect();
  globalThis.__llmKafkaProducer__ = producer;
  return producer;
}

export async function POST(request: NextRequest) {
  const missing = ['KAFKA_BROKER', 'KAFKA_TOPIC', 'KAFKA_USER', 'KAFKA_PASS']
    .filter(k => !process.env[k]);
  if (missing.length) {
    return NextResponse.json(
      { status: 'error', message: `Missing env vars: ${missing.join(',')}` },
      { status: 500 },
    );
  }

  const { ts, siteId, llmFamily, path, ipHash, userAgent } = await request.json();

  let parsedTs: number;
  try {
    parsedTs = typeof ts === 'number' ? ts : Math.floor(new Date(ts).getTime() / 1000);
    if (isNaN(parsedTs)) throw new Error('Invalid timestamp');
  } catch {
    console.warn('[API] Rejected invalid ts:', ts);
    return NextResponse.json({ status: 'error', message: 'Invalid timestamp' }, { status: 400 });
  }

  const message = {
    ts: parsedTs,
    siteId,
    llmFamily,
    path,
    ipHash,
    userAgent,
  };

  console.log('[API] Queuing LLM hit:', message);

  try {
    const producer = await getProducer();
    await producer.send({
      topic: process.env.KAFKA_TOPIC!,
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log('[API] Message queued to Kafka');
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
