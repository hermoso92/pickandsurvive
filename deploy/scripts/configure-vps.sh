#!/usr/bin/env bash
# Genera .env.stack en la raíz del repo (gitignored): Postgres, JWT, URLs y DATABASE_URL.
# Uso:
#   bash deploy/scripts/configure-vps.sh              # te pregunta URLs (Enter = local)
#   bash deploy/scripts/configure-vps.sh --yes        # sin preguntas, URLs locales + secretos nuevos
#   NEXT_PUBLIC_API_URL=https://api.tu.com APP_URL=https://app.tu.com bash deploy/scripts/configure-vps.sh --yes
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -y | --yes) YES=1 ;;
    --local | --defaults) YES=1 ;;
    *)
      echo "opción desconocida: $1" >&2
      exit 1
      ;;
  esac
  shift || true
done

api_url="${NEXT_PUBLIC_API_URL:-}"
app_url="${APP_URL:-}"

if [[ $YES -eq 0 ]]; then
  read -r -p "URL pública de la API (la usa el navegador) [http://localhost:3001]: " input_api || true
  api_url="${input_api:-$api_url}"
  read -r -p "URL pública del front (APP_URL / emails) [http://localhost:3000]: " input_app || true
  app_url="${input_app:-$app_url}"
fi

api_url="${api_url:-http://localhost:3001}"
app_url="${app_url:-http://localhost:3000}"

POSTGRES_USER="${POSTGRES_USER:-pickandsurvive}"
POSTGRES_DB="${POSTGRES_DB:-pickandsurvive}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 48)}"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

umask 077
cat >.env.stack <<EOF
# Generado por deploy/scripts/configure-vps.sh — no lo subas a git
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_API_URL=${api_url}
APP_URL=${app_url}
DATABASE_URL=${DATABASE_URL}
EOF

echo "listo: .env.stack (contraseña Postgres y JWT nuevos salvo que los hayas exportado antes)."
echo "levantá el stack: pnpm docker:stack   o   bash deploy/scripts/stack-up.sh"
