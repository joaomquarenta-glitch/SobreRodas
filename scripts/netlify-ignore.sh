#!/usr/bin/env bash
# Netlify: sair com 0 = não publicar, 1 = publicar.
set -u
[ -z "${CACHED_COMMIT_REF:-}" ] && exit 1
[ "${CACHED_COMMIT_REF}" = "${COMMIT_REF:-}" ] && exit 1
if ! git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- site netlify.toml scripts/netlify-ignore.sh 2>/dev/null; then
  exit 1
fi
case "$(git log -1 --format=%s "$COMMIT_REF")" in
  "Dados - atualização diária"*) exit 1 ;;
esac
exit 0
