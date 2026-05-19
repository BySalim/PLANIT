#!/usr/bin/env bash
# Backup PostgreSQL database to a timestamped file.
# Usage: ./backup-postgres.sh [output-dir]

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="planit_dev_${TIMESTAMP}.sql"

mkdir -p "$OUTPUT_DIR"

docker compose -f "$(dirname "$0")/../docker-compose.dev.yml" exec -T postgres \
  pg_dump -U planit planit_dev > "${OUTPUT_DIR}/${FILENAME}"

echo "Backup written to ${OUTPUT_DIR}/${FILENAME}"
