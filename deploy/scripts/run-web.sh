#!/usr/bin/env bash
set -euo pipefail
REPO="${PICKANDSURVIVE_ROOT:-${HOME}/PickandSurvive}"
export NODE_ENV=production
cd "${REPO}/apps/web"
if [[ -f ./node_modules/.bin/next ]]; then
  exec ./node_modules/.bin/next start --port 3000
fi
exec node ./node_modules/next/dist/bin/next start --port 3000
