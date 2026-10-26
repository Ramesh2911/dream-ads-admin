#!/usr/bin/env bash
set -euo pipefail

# cPanel HTTPS deploy for dream-ads-admin (static SPA).
# Required env: CPANEL_SSO_EMAIL, CPANEL_SSO_PASSWORD (WHMCS client credentials)
# Artifacts expected: dist/ built locally (index.html, assets/, ...)

CPANEL_HOST="${CPANEL_HOST:-server.shodns.in:2083}"
WHMCS_URL="${WHMCS_URL:-https://manage.shohost.com}"
WHMCS_PRODUCT_ID="${WHMCS_PRODUCT_ID:-2942}"
CPANEL_HOME="${CPANEL_HOME:-/home/dreamads}"
DOCROOT="${DOCROOT:-${CPANEL_HOME}/admin}"
DOCROOT_ENC="${DOCROOT//\//%2F}"
DIST="${DIST:-dist}"
VERIFY_URL="${VERIFY_URL:-https://admin.dreamads.in/}"
VERIFY_GREP="${VERIFY_GREP:-Dream Ads}"

: "${CPANEL_SSO_EMAIL:?CPANEL_SSO_EMAIL is required}"
: "${CPANEL_SSO_PASSWORD:?CPANEL_SSO_PASSWORD is required}"

JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$JAR" "$BODY"' EXIT

log() { echo "[deploy] $*"; }
die() { echo "::error::$*"; exit 1; }

login() {
  local token url cpsess
  token=$(curl -fsS -c "$JAR" -b "$JAR" "$WHMCS_URL/index.php/login" \
    | grep -o 'name="token" value="[^"]*"' | head -1 | sed 's/.*value="//; s/"$//' || true)
  [ -n "$token" ] || die "WHMCS CSRF token not found"
  curl -fsS -c "$JAR" -b "$JAR" -X POST "$WHMCS_URL/index.php/login" \
    --data-urlencode "username=$CPANEL_SSO_EMAIL" \
    --data-urlencode "password=$CPANEL_SSO_PASSWORD" \
    --data "token=${token}&submit=+" -o /dev/null
  url=$(curl -sL -c "$JAR" -b "$JAR" \
    "$WHMCS_URL/clientarea.php?action=productdetails&id=${WHMCS_PRODUCT_ID}&dosinglesignon=1&app=FileManager_Home" \
    -o /dev/null -w '%{url_effective}')
  cpsess=$(grep -o 'cpsess[0-9]*' <<<"$url" | head -1 || true)
  [ -n "$cpsess" ] || die "cPanel SSO did not yield a session (final url: $url)"
  BASE="https://${CPANEL_HOST}/${cpsess}"
  curl -fsS -b "$JAR" "$BASE/execute/Fileman/list_files?dir=${CPANEL_HOME}" | grep -q '"status": *1' \
    || die "cPanel API auth check failed"
  log "cPanel session: $cpsess"
}

upload() { # <local-path> <remote-filename> <remote-dir>
  local resp reason enc
  # cPanel Fileman can silently no-op overwrites of protected names (e.g. index.html):
  # delete the destination first (ignore errors), then upload fresh.
  enc=$(printf '%s' "$3/$2" | jq -sRr @uri)
  curl -s -b "$JAR" "$BASE/execute/Fileman/delete_file?path=$enc" -o /dev/null || true
  resp=$(curl -fsS --retry 3 --retry-delay 2 -b "$JAR" -X POST "$BASE/execute/Fileman/upload_files" \
    -F "dir=$3" -F "file=@$1;filename=$2" -F overwrite=1)
  jq -e '.data.succeeded >= 1 and .data.failed == 0' <<<"$resp" >/dev/null \
    || die "upload of $2 failed: $resp"
  reason=$(jq -r '.data.uploads[0].reason // "no-reason"' <<<"$resp")
  log "uploaded $3/$2 ($reason)"
}

ensure_dir() { # <name> inside DOCROOT (best effort; may already exist)
  curl -s -b "$JAR" \
    "$BASE/json-api/cpanel?api.version=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=mkdir&dir=${DOCROOT_ENC}&name=$1" \
    -o "$BODY" || true
}

verify() {
  local i code body
  for i in $(seq 1 15); do
    code=$(curl -s -o "$BODY" -w '%{http_code}' --max-time 30 "$VERIFY_URL" || true)
    body=$(cat "$BODY" 2>/dev/null || true)
    if [ "$code" = "200" ] && grep -q "$VERIFY_GREP" <<<"$body"; then
      log "verify OK: $VERIFY_URL"
      return 0
    fi
    log "verify attempt $i: http=$code"
    sleep 5
  done
  die "verification failed for $VERIFY_URL"
}

main() {
  [ -d "$DIST" ] || die "dist/ not found — build first"
  login
  # best-effort creation of every subdir referenced by the build
  while IFS= read -r -d '' f; do
    rel="${f#"$DIST"/}"
    reldir=$(dirname "$rel")
    if [ "$reldir" != "." ]; then
      ensure_dir "$reldir"
    fi
  done < <(find "$DIST" -type f -print0)
  # upload every file with its relative directory
  while IFS= read -r -d '' f; do
    rel="${f#"$DIST"/}"
    reldir=$(dirname "$rel")
    if [ "$reldir" = "." ]; then
      upload "$f" "$rel" "$DOCROOT"
    else
      upload "$f" "$(basename "$rel")" "$DOCROOT/$reldir"
    fi
  done < <(find "$DIST" -type f -print0 | sort -z)
  verify
  log "deploy complete"
}

main "$@"
