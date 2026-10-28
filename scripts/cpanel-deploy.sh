#!/usr/bin/env bash
set -euo pipefail

# Git Bash/MSYS: stop argument path translation — it mangles `-F dir=/home/...`
# (uploads land nowhere). No-op on Linux CI runners.
export MSYS_NO_PATHCONV=1
# cPanel HTTPS deploy for dream-ads-admin (static SPA, Fileman-based).
#
# Auth: CPANEL_API_TOKEN (UAPI/API2 file ops, IP-independent).
# Static docroot needs NO restart — LiteSpeed serves files directly.
#
# Uploads: plain overwrite only — NEVER delete first (cPanel's async trash
# queue can eat a freshly re-uploaded file). Every batch is verified against
# list_files/get_file_content (cPanel sometimes claims success without the
# file landing).

CPANEL_HOST="${CPANEL_HOST:-server.shodns.in:2083}"
CPANEL_USER="${CPANEL_USER:-dreamads}"
CPANEL_HOME="${CPANEL_HOME:-/home/dreamads}"
DOCROOT="${DOCROOT:-${CPANEL_HOME}/admin}"
DIST="${DIST:-dist}"
VERIFY_URL="${VERIFY_URL:-https://admin.dreamads.in/}"
VERIFY_GREP="${VERIFY_GREP:-Dream Ads}"
MARKER_VALUE="${MARKER_VALUE:-${GITHUB_RUN_ID:-}}"
MARKER_URL="${MARKER_URL:-https://admin.dreamads.in/_deploy-marker.txt}"

: "${CPANEL_API_TOKEN:?CPANEL_API_TOKEN is required}"

JAR="$(mktemp)"
BODY="$(mktemp)"
# with MSYS_NO_PATHCONV, /tmp paths break curl -o — convert to Windows form
if command -v cygpath >/dev/null 2>&1; then
  JAR="$(cygpath -m "$JAR")"
  BODY="$(cygpath -m "$BODY")"
fi
trap 'rm -f "$JAR" "$BODY"' EXIT

log() { echo "[deploy] $*"; }
die() { echo "::error::$*"; exit 1; }

CURL_AUTH=(-H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}")
BASE="https://${CPANEL_HOST}"
log "auth: cPanel API token"

api() { curl -fsS "${CURL_AUTH[@]}" --retry 3 --retry-delay 2 "$@"; }

ensure_dir() { # <absolute-remote-dir>
  local parent name
  parent=$(dirname "$1")
  name=$(basename "$1")
  api "$BASE/json-api/cpanel?api.version=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=mkdir&dir=$(printf '%s' "$parent" | jq -sRr @uri)&name=$(printf '%s' "$name" | jq -sRr @uri)" \
    >/dev/null || true
}

dir_files() {
  api "$BASE/execute/Fileman/list_files?showhiddenfiles=1&dir=$(printf '%s' "$1" | jq -sRr @uri)" \
    | jq -r '.data[] | select(.type=="file") | .file' || true
}

verify_present() { # <remote-dir> <basename>  (dotfiles never appear in listings)
  case "$2" in
    .*)
      api "$BASE/execute/Fileman/get_file_content?dir=$(printf '%s' "$1" | jq -sRr @uri)&file=$(printf '%s' "$2" | jq -sRr @uri)" \
        | jq -e '.status == 1' >/dev/null 2>&1
      ;;
    *)
      dir_files "$1" | grep -qxF "$2"
      ;;
  esac
}

upload_batch() { # <remote-dir> <local-file>...
  local remote="$1"; shift
  local args=() f resp n="$#" missing=""
  for f in "$@"; do
    args+=(-F "file=@${f};filename=$(basename "$f")")
  done
  resp=$(curl -fsS "${CURL_AUTH[@]}" --retry 3 --retry-delay 2 -X POST "$BASE/execute/Fileman/upload_files" \
    -F "dir=$remote" -F overwrite=1 "${args[@]}" || true)
  if ! jq -e ".data.succeeded >= $n and .data.failed == 0" <<<"$resp" >/dev/null 2>&1; then
    log "batch response not clean for $remote (n=$n): $(jq -c '.data.uploads // .errors // empty' <<<"$resp" 2>/dev/null | head -c 300)"
  fi
  # one listing per batch (not per file); dotfiles never appear in listings,
  # so they fall back to get_file_content (verify_present semantics)
  local listing
  listing=$(dir_files "$remote")
  check_in_batch() { # <basename> - returns 0 if present
    local base="$1"
    case "$base" in
      .*) verify_present "$remote" "$base" ;;
      *)  grep -qxF "$base" <<<"$listing" ;;
    esac
  }
  for f in "$@"; do
    check_in_batch "$(basename "$f")" || missing="$missing $(basename "$f")"
  done
  if [ -n "$missing" ]; then
    log "batch phantom for $remote - retrying per-file:$missing"
    for f in "$@"; do
      local base i
      base=$(basename "$f")
      check_in_batch "$base" && continue
      for i in 1 2 3 4 5; do
        curl -fsS "${CURL_AUTH[@]}" --retry 3 --retry-delay 2 -X POST "$BASE/execute/Fileman/upload_files" \
          -F "dir=$remote" -F overwrite=1 -F "file=@${f};filename=$base" >/dev/null || true
        listing=$(dir_files "$remote")
        check_in_batch "$base" && break
        sleep 2
      done
      listing=$(dir_files "$remote")
      check_in_batch "$base" \
        || die "upload vanished after retries: $remote/$base"
    done
  fi
  log "uploaded -> $remote ($n files, verified present)"
}
upload_tree() { # <local-dir> <remote-dir>
  local ldir="$1" rdir="$2"
  [ -d "$ldir" ] || die "missing $ldir"
  ensure_dir "$rdir"
  local cur="" target f rel reldir
  local -a group=()
  flush() {
    if [ "${#group[@]}" -gt 0 ]; then upload_batch "$cur" "${group[@]}"; fi
    group=()
  }
  while IFS= read -r f; do
    rel="${f#"$ldir"/}"
    reldir=$(dirname "$rel")
    target="$rdir"
    if [ "$reldir" != "." ]; then
      target="$rdir/$reldir"
      ensure_dir "$target"
    fi
    if [ "$target" != "$cur" ]; then
      flush
      cur="$target"
    fi
    group+=("$f")
    if [ "${#group[@]}" -ge 40 ]; then flush; fi
  done < <(find "$ldir" -type f | LC_ALL=C sort)
  flush
  return 0
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

verify_marker() {
  [ -n "$MARKER_VALUE" ] || { log "no MARKER_VALUE/GITHUB_RUN_ID — skipping marker check"; return 0; }
  local i code body fm
  for i in $(seq 1 15); do
    code=$(curl -s -o "$BODY" -w '%{http_code}' --max-time 30 "${MARKER_URL}?r=${i}-${RANDOM}${RANDOM}" || true)
    body=$(cat "$BODY" 2>/dev/null | tr -d '[:space:]' || true)
    if [ "$code" = "200" ] && [ "$body" = "$MARKER_VALUE" ]; then
      log "marker OK: _deploy-marker.txt = $MARKER_VALUE"
      return 0
    fi
    fm=$(api "$BASE/execute/Fileman/get_file_content?dir=$(printf '%s' "$DOCROOT" | jq -sRr @uri)&file=_deploy-marker.txt" \
      | jq -r '.data.content // empty' | tr -d '[:space:]' || true)
    log "marker attempt $i: http=$code web='$body' fileman='$fm' want='$MARKER_VALUE'"
    sleep 4
  done
  die "deploy marker not live — files did not reach the server"
}

main() {
  [ -d "$DIST" ] || die "dist/ not found — run npm run build first"
  upload_tree "$DIST" "$DOCROOT"
  sleep 2
  verify
  verify_marker
  log "deploy complete"
}

main "$@"
