#!/usr/bin/env bash
# Builds Screen Sage in Google Cloud Build and ships it to Cloud Run.
# Safe to run every time you want the live site to match your code.
#
#   npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=yggdrasil-476219
REGION=us-central1
SERVICE=screen-sage
RUNTIME_SA="screen-sage-web@$PROJECT.iam.gserviceaccount.com"

if [[ ! -f deploy.env ]]; then
  echo "✗ deploy.env is missing — run: npm run setup:production"; exit 1
fi
set -a; source deploy.env; set +a
: "${SUPABASE_URL:?missing in deploy.env}"
: "${SUPABASE_PUBLISHABLE_KEY:?missing in deploy.env}"

for s in supabase-secret-key desk-password session-secret tmdb-api-key; do
  if ! gcloud secrets describe "$s" --project "$PROJECT" >/dev/null 2>&1; then
    echo "✗ secret '$s' doesn't exist yet — run: npm run setup:production"; exit 1
  fi
done

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
SITE_URL=${SITE_URL:-https://$SERVICE-$PROJECT_NUMBER.$REGION.run.app}
NEWSLETTER_FROM=${NEWSLETTER_FROM:-Screen Sage <onboarding@resend.dev>}

SECRETS="SUPABASE_SECRET_KEY=supabase-secret-key:latest"
SECRETS+=",DESK_PASSWORD=desk-password:latest"
SECRETS+=",SESSION_SECRET=session-secret:latest"
SECRETS+=",TMDB_API_KEY=tmdb-api-key:latest"
if gcloud secrets describe resend-api-key --project "$PROJECT" >/dev/null 2>&1; then
  SECRETS+=",RESEND_API_KEY=resend-api-key:latest"
fi

echo "✦ Deploying to $SITE_URL (takes ~3–5 minutes)…"
# ^|^ switches gcloud's list separator from "," to "|" so values may contain commas
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "^|^SITE_URL=$SITE_URL|SUPABASE_URL=$SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY|NEWSLETTER_FROM=$NEWSLETTER_FROM" \
  --set-secrets "$SECRETS" \
  --quiet

echo "✦ Live at $SITE_URL"
