// src/app/page.tsx
export const runtime = "edge"; // super-light Edge runtime

export default function AnalyticsHome() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "40rem",
        margin: "4rem auto",
        lineHeight: 1.6,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        📊 LLM Analytics API
      </h1>
      <p>
        Welcome! This endpoint powers server-side analytics for LLM crawlers.
      </p>
      <p>
        <strong>Health-check:</strong>{" "}
        <code>/api/health-check</code>
      </p>
      <p>
        <em>
          All crawler hits are logged to Kafka&nbsp;→ ClickHouse for analysis.
        </em>
      </p>
    </main>
  );
}
