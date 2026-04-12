#!/bin/bash
# Contract Finder — hourly match + email pipeline trigger
# Call this from cron: 0 * * * * /path/to/scripts/run-match.sh >> /var/log/cf-match.log 2>&1

APP_URL="${CF_APP_URL:-http://localhost:4000}"
CRON_SECRET="${CRON_SECRET:-dev-cron-secret-change-in-prod}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running match pipeline..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/match" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 60)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "[$(date '+%Y-%m-%d %H:%M:%S')] HTTP ${HTTP_CODE}: ${BODY}"

if [ "$HTTP_CODE" != "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: pipeline failed with HTTP ${HTTP_CODE}"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
