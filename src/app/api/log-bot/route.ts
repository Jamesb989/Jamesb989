// src/app/api/log-bot/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "llm-analytics",
  brokers: (process.env.KAFKA_BROKER! || "")
    .split(",")
    .map(b => b.trim()),
  ssl: true,
  sasl: {
    mechanism: "scram-sha-256",
    username: process.env.KAFKA_USER!,
    password: process.env.KAFKA_PASS!,
  },
});

const producer = kafka.producer();

export async function POST(request: NextRequest) {
  try {
    const { ts, siteId, llmFamily, path, ipHash } = await request.json();

    console.log("Producing to Kafka:", {
      brokers: process.env.KAFKA_BROKER,
      topic: process.env.KAFKA_TOPIC,
      message: { ts, siteId, llmFamily, path, ipHash },
    });

    await producer.connect();
    await producer.send({
      topic: process.env.KAFKA_TOPIC!,
      messages: [
        { value: JSON.stringify({ ts, siteId, llmFamily, path, ipHash }) },
      ],
    });
    await producer.disconnect();

    return NextResponse.json({ status: "queued" }, { status: 200 });
  } catch (error) {
    console.error("Kafka publish error:", error);
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Use POST to queue LLM hits" },
    { status: 200 }
  );
}




















