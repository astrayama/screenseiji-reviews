#!/usr/bin/env bash
# Copies everything you've written locally into the hosted Supabase database.
#
#   npm run push:data
#
# `supabase db push` only sends the table STRUCTURE. This sends the rows:
# your reviews, titles, tags, lists and settings. Safe to stop at any point —
# it refuses to run if the hosted database already has reviews in it, so it
# can never overwrite work you've done online.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL_CONTAINER=supabase_db_screen-sage
POOLER_FILE=supabase/.temp/pooler-url

[[ -f $POOLER_FILE ]] || { echo "✗ Not linked to a hosted project yet — run: npx supabase link"; exit 1; }
docker exec "$LOCAL_CONTAINER" pg_isready -U postgres >/dev/null 2>&1 \
  || { echo "✗ Your local database isn't running — run: npx supabase start"; exit 1; }

# Pull host/port/user/db out of the cached pooler URL (it carries no password).
URL=$(cat "$POOLER_FILE")
eval "$(node -e '
const u = new URL(process.argv[1]);
const q = s => "'"'"'" + String(s).replace(/'"'"'/g, "") + "'"'"'";
console.log(`PGHOST=${q(u.hostname)}`);
console.log(`PGPORT=${q(u.port || 5432)}`);
console.log(`PGUSER=${q(decodeURIComponent(u.username))}`);
console.log(`PGDATABASE=${q((u.pathname || "/postgres").slice(1) || "postgres")}`);
' "$URL")"

echo
echo "✦ Copying your local work up to the hosted database"
echo "  host: $PGHOST"
read -rsp "  Supabase database password (hidden): " PGPASSWORD; echo
export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

run_remote() { docker run --rm -i -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD \
  postgres:17-alpine psql -v ON_ERROR_STOP=1 "$@"; }

echo "  checking the hosted database…"
EXISTING=$(run_remote -t -A -c "select count(*) from reviews;" 2>/dev/null | tr -d '[:space:]') || {
  echo "✗ Couldn't connect. Wrong password, or the project is paused in the Supabase dashboard."; exit 1; }
if [[ ${EXISTING:-0} -gt 0 ]]; then
  echo "✗ The hosted database already has $EXISTING review(s). Stopping so nothing gets overwritten."
  exit 1
fi

# Parent tables before the tables that reference them, so foreign keys hold.
TABLES=(franchises titles seasons episodes tags title_tags reviews
        subscore_categories review_subscores now_reviewing lists list_entries
        subscribers dispatches page_views site_config)

DUMP=$(mktemp -t screen-sage-data)
trap 'rm -f "$DUMP"' EXIT
for t in "${TABLES[@]}"; do
  docker exec "$LOCAL_CONTAINER" pg_dump -U postgres -d postgres \
    --data-only --no-owner --no-privileges --table="public.$t" >> "$DUMP"
done
echo "  prepared $(grep -c '^COPY' "$DUMP") table(s) of data"

run_remote < "$DUMP" >/dev/null
echo "  ✓ sent"

echo "  verifying…"
run_remote -t -A -c "select 'reviews='||count(*) from reviews union all select 'titles='||count(*) from titles union all select 'tags='||count(*) from tags;" | sed 's/^/   /'
unset PGPASSWORD
echo
echo "✦ Done. Refresh https://reviews.screenseiji.com"
