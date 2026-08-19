#!/bin/sh
set -eu

mkdir -p /data

echo "[start] Running database migrations..."
npx prisma migrate deploy

echo "[start] Starting Next.js on port ${PORT:-3000}..."
exec ./node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
