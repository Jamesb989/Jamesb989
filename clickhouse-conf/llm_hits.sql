CREATE TABLE IF NOT EXISTS llm_hits (
  ts DateTime,
  site_id String,
  llm_family String,
  path String,
  ip_hash String,
  user_agent String
) ENGINE = MergeTree
ORDER BY ts;
