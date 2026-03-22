#!/usr/bin/env bash
# Carga .env.stack (y opcional .env); si no existe .env.stack, genera uno con configure-vps.sh --yes.
# Pensado para ser sourceado desde otros scripts en deploy/scripts/.

_ST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$_ST_ROOT" || exit 1

if [[ ! -f "$_ST_ROOT/.env.stack" ]]; then
  bash "$_ST_ROOT/deploy/scripts/configure-vps.sh" --yes || exit 1
fi

set -a
# shellcheck disable=SC1091
source "$_ST_ROOT/.env.stack" || exit 1
[[ -f "$_ST_ROOT/.env" ]] && source "$_ST_ROOT/.env"
set +a

unset _ST_ROOT
