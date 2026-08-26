#!/usr/bin/env bash
#
# Usage: ./scripts/test_pipeline.sh <BASE_URL>
# Example: ./scripts/test_pipeline.sh http://localhost:3000

HOST=${1:-http://localhost:3000}

# Adjust these for your local ClickHouse creds:
# Set CH_PASSWORD to your ClickHouse user's password before running.
CH_CLI="docker exec clickhouse-local clickhouse-client --user default --password ${CH_PASSWORD} --query"

for UA in "ChatGPT" "Claude/1.0" "BingAI/1.0" "Mozilla/5.0"; do
  echo "→ Testing UA: $UA"
  # hit health-check
  RESP=$(curl -s -A "$UA" "$HOST/api/health-check")
  echo "  Response: $RESP"
  # fetch last row
  LAST=$($CH_CLI "SELECT llm_family, path FROM default.llm_hits ORDER BY ts DESC LIMIT 1;")
  echo "  Last CH row: $LAST"
  echo
done
