# Dockerfile to build a ClickHouse server with a custom config
FROM clickhouse/clickhouse-server:latest

# Copy your edited config.xml into config.d to override the default user password
COPY clickhouse-conf/config.xml /etc/clickhouse-server/config.d/reset-default-password.xml
