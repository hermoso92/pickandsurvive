#!/bin/sh
set -e
cd /app
pnpm --filter @pickandsurvive/api exec prisma migrate deploy
cd /app/apps/api
exec node dist/main.js
