#!/usr/bin/env bash
# One-time (or whenever a key changes): stores Screen Sage's production
# settings. Passwords and secret keys are typed hidden and go straight into
# Google Secret Manager — never onto the screen, into a file, or into git.
#
#   npm run setup:production
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=yggdrasil-476219

put_secret() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
    printf %s "$value" | gcloud secrets versions add "$name" --project "$PROJECT" --data-file=- >/dev/null
  else
    printf %s "$value" | gcloud secrets create "$name" --project "$PROJECT" \
      --replication-policy=automatic --data-file=- >/dev/null
  fi
  echo "   ✓ saved"
}

ask() { # prompt, regex, error
  local reply
  while true; do
    read -rp "$1" reply
    reply=$(printf %s "$reply" | tr -d '[:space:]')
    [[ $reply =~ $2 ]] && { printf %s "$reply"; return; }
    echo "   ✗ $3" >&2
  done
}

ask_hidden() { # prompt, regex, error
  local reply
  while true; do
    read -rsp "$1" reply; echo >&2
    reply=$(printf %s "$reply" | tr -d '[:space:]')
    [[ $reply =~ $2 ]] && { printf %s "$reply"; return; }
    echo "   ✗ $3" >&2
  done
}

echo
echo "✦ Screen Sage — production setup"
echo "  Have your Supabase dashboard open: Project Settings → API Keys."
echo

echo "1/5  Supabase Project URL (looks like https://abcdefgh.supabase.co)"
url=$(ask "     paste it: " '^https://[a-z0-9]+\.supabase\.co$' "that should look like https://abcdefgh.supabase.co")

echo "2/5  Publishable key (starts with sb_publishable_)"
pub=$(ask "     paste it: " '^sb_publishable_' "that should start with sb_publishable_")

echo "3/5  Secret key (starts with sb_secret_) — typing is hidden"
sec=$(ask_hidden "     paste it: " '^sb_secret_' "that should start with sb_secret_")
put_secret supabase-secret-key "$sec"; unset sec

echo "4/5  Choose your Desk password — typing is hidden (12+ characters)"
while true; do
  pw1=$(ask_hidden "     password: " '^.{12,}$' "use at least 12 characters")
  pw2=$(ask_hidden "     once more: " '.' "")
  [[ $pw1 == "$pw2" ]] && break
  echo "   ✗ those didn't match — try again"
done
put_secret desk-password "$pw1"; unset pw1 pw2

echo "5/5  Resend API key for the newsletter (starts with re_) — hidden"
read -rsp "     paste it, or just press Enter to skip for now: " rs; echo
rs=$(printf %s "$rs" | tr -d '[:space:]')
if [[ -n $rs ]]; then
  if [[ $rs =~ ^re_ ]]; then put_secret resend-api-key "$rs"; else echo "   ✗ skipped — that didn't start with re_"; fi
else
  echo "   – skipped (the site works without it; only sending dispatches needs it)"
fi
unset rs

cat > deploy.env <<EOF
# Non-secret production settings, read by scripts/deploy.sh.
# Secrets live in Google Secret Manager, not here.
SUPABASE_URL=$url
SUPABASE_PUBLISHABLE_KEY=$pub
# NEWSLETTER_FROM=Screen Sage <dispatches@yourdomain.com>
# SITE_URL=https://your-custom-domain.com
EOF
echo
echo "✦ Done. Saved deploy.env. Next: npm run deploy"
