#!/usr/bin/env bash
set -euo pipefail
REPO="${PICKANDSURVIVE_ROOT:-${HOME}/PickandSurvive}"
export NODE_ENV=production
cd "${REPO}/apps/api"
exec node dist/main.js
