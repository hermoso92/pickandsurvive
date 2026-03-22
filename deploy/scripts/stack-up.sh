#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/load-stack-env.sh"

[[ -f deploy/env/postgres.env ]] || { echo "error: falta deploy/env/postgres.env" >&2; exit 1; }
[[ -f deploy/env/api.stack.env ]] || { echo "error: falta deploy/env/api.stack.env" >&2; exit 1; }

exec docker compose -f docker-compose.stack.yml up -d --build
