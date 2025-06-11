// src/app/api/log-bot/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Kafka } from "kafkajs";

export async function POST(request: NextRequest) {
  // Log ALL effective env vars for debug
  console.log("KAFKA_BROKER:", process.env.KAFKA_BROKER);
  console.log("KAFKA_TOPIC:", process.env.KAFKA_TOPIC);
  console.log("KAFKA_USERNAME:", process.env.KAFKA_USERNAME);
  console.log("KAFKA_PASSWORD present:", !!process.env.KAFKA_PASSWORD);

  // Defensive: check required envs
  if (
    !process.env.KAFKA_BROKER ||
    !process.env.KAFKA_TOPIC ||
    !process.env.KAFKA_USERNAME ||
    !process.env.KAFKA_PASSWORD
  ) {
    return NextResponse.json(
      { status: "error", message: "Missing Kafka env variables" },
      { status: 500 }
    );
  }

  // Kafka client config
  const kafka = new Kafka({
    clientId: "llm-analytics",
    brokers: process.env.KAFKA_BROKER.split(",").map(b => b.trim()),
    ssl: true,
    sasl: {
      mechanism: "scram-sha-256",
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
  });

  const producer = kafka.producer();

  try {
    const { ts, siteId, llmFamily, path, ipHash } = await request.json();

    console.log("Producing to Kafka:", {
      brokers: process.env.KAFKA_BROKER,
      topic: process.env.KAFKA_TOPIC,
      user: process.env.KAFKA_USERNAME,
      message: { ts, siteId, llmFamily, path, ipHash },
    });

    await producer.connect();
    await producer.send({
      topic: process.env.KAFKA_TOPIC,
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





















