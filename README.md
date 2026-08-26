This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Analytics Pipeline

This demo includes a lightweight analytics system for tracking large language model (LLM) bots that crawl the site. A `middleware` interceptor in `src/middleware.ts` inspects each incoming request. When the user agent matches a known LLM signature, it hashes the IP address and sends a JSON payload to the Lambda proxy URL.

## Required Environment Variables

The ingest script and middleware expect several variables:

- `KAFKA_BROKER` – address of the Kafka broker
- `KAFKA_TOPIC` – topic that receives log events
- `KAFKA_USER` and `KAFKA_PASS` – SASL credentials for Kafka
- `CLICKHOUSE_URL` – HTTP endpoint for ClickHouse
- `CLICKHOUSE_USER` and `CLICKHOUSE_PASSWORD` – ClickHouse credentials
- `LAMBDA_PROXY_URL` – URL of the Lambda proxy that forwards events to Kafka

## Running the Pipeline

1. Start the ingestion consumer which reads from Kafka and inserts into ClickHouse:

   ```bash
   npm run ingest
   ```

2. With the server running you can exercise the whole pipeline using:

   ```bash
   ./scripts/test_pipeline.sh http://localhost:3000
   ```

   This script hits the `health-check` API and prints the last row from ClickHouse for each test user agent.

## Lambda Proxy

The Lambda function that receives middleware events and publishes them to Kafka lives in the [`lambda-proxy/`](lambda-proxy) directory. Deploy this function with a role that allows network access to your Kafka cluster.
