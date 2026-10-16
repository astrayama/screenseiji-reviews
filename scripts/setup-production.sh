#!/usr/bin/env bash
# Update the live site's keys and passwords (stored in Vercel, not in any file).
# Press Enter at any prompt to leave that one unchanged.
#
#   npm run setup:production
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .vercel/project.json ]] || { echo "✗ Not linked to Vercel yet — run: npx vercel link"; exit 1; }

put() { # name, value  — replace in both production and preview
  local name=$1 value=$2
  for env in production preview; do
    npx --yes vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
    printf %s "$value" | npx --yes vercel env add "$name" "$env" >/dev/null 2>&1
  done
  echo "   ✓ updated $name"
}

ask() { # prompt, regex, error, hidden?
  local reply
  while true; do
    if [[ ${4:-} == hidden ]]; then read -rsp "$1" reply; echo >&2; else read -rp "$1" reply; fi
    reply=$(printf %s "$reply" | tr -d '[:space:]')
    [[ -z $reply ]] && { printf %s ""; return; }          # Enter = skip
    [[ $reply =~ $2 ]] && { printf %s "$reply"; return; }
    echo "   ✗ $3" >&2
  done
}

echo
echo "✦ Screen Sage — update live settings (Enter skips a line)"
echo

v=$(ask "1/5  Supabase Project URL:          " '^https://[a-z0-9]+\.supabase\.co$' "should look like https://abcdefgh.supabase.co")
[[ -n $v ]] && put SUPABASE_URL "$v"

v=$(ask "2/5  Publishable key:               " '^(sb_publishable_|eyJ)' "should start with sb_publishable_")
[[ -n $v ]] && put SUPABASE_PUBLISHABLE_KEY "$v"

v=$(ask "3/5  Secret key (hidden):           " '^(sb_secret_|eyJ)' "should start with sb_secret_" hidden)
[[ -n $v ]] && put SUPABASE_SECRET_KEY "$v"

v=$(ask "4/5  New Desk password (hidden):    " '^.{12,}$' "use at least 12 characters" hidden)
[[ -n $v ]] && put DESK_PASSWORD "$v"

v=$(ask "5/5  Resend API key (hidden):       " '^re_' "should start with re_" hidden)
[[ -n $v ]] && put RESEND_API_KEY "$v"

echo
echo "✦ Saved. Run 'npm run deploy' to put the changes live."
