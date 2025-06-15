#!/usr/bin/env bash
#
# Usage: ./scripts/test_pipeline.sh <BASE_URL>
# Example: ./scripts/test_pipeline.sh http://localhost:3000
#
# The script hits the health-check endpoint using a set of
# User-Agent strings. After each request it fetches the most
# recent row from ClickHouse and verifies that the stored
# `llm_family` matches the User-Agent under test. A mismatch
# causes the script to exit with a non-zero status.

HOST=${1:-http://localhost:3000}

# Adjust these for your local ClickHouse creds:
CH_CLI="docker exec clickhouse-local clickhouse-client --user default --password CqP0fqqmYD.2J --query"

for UA in "ChatGPT" "Claude/1.0" "BingAI/1.0" "Mozilla/5.0"; do
  echo "→ Testing UA: $UA"
  # hit health-check
  RESP=$(curl -s -A "$UA" "$HOST/api/health-check")
  echo "  Response: $RESP"
  # fetch last row
  LAST=$($CH_CLI "SELECT llm_family FROM default.llm_hits ORDER BY ts DESC LIMIT 1;")
  echo "  Last CH row: $LAST"
  EXPECTED=${UA%%/*}
  if [[ "$LAST" != "$EXPECTED" ]]; then
    echo "  ❌ llm_family mismatch: expected '$EXPECTED' got '$LAST'"
    exit 1
  fi
  echo
done

echo "✅ All checks passed"
