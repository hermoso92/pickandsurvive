#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.stack" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/load-stack-env.sh"
else
  # Compose igual parsea el YAML; estos valores no se usan al hacer down.
  export POSTGRES_PASSWORD=unused \
    DATABASE_URL=postgresql://unused:unused@postgres:5432/unused \
    JWT_SECRET=unused \
    APP_URL=http://localhost \
    NEXT_PUBLIC_API_URL=http://localhost:3001
fi

exec docker compose -f docker-compose.stack.yml down "$@"
