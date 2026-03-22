#!/usr/bin/env bash
# Volcado del Postgres del stack Docker (pickandsurvive_postgres).
# Uso: BACKUP_DIR=~/backups/pickandsurvive ./deploy/scripts/backup-postgres.sh
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-pickandsurvive_postgres}"
BACKUP_DIR="${BACKUP_DIR:-${HOME}/pickandsurvive-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

docker inspect "$CONTAINER" >/dev/null 2>&1 || {
  echo "error: contenedor $CONTAINER no encontrado (¿está levantado docker-compose.stack.yml?)" >&2
  exit 1
}

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/pickandsurvive-${TS}.sql.gz"

docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -h 127.0.0.1 "$POSTGRES_DB"' | gzip >"$OUT"

echo "backup: $OUT"

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -name 'pickandsurvive-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
fi
