#!/usr/bin/env bash
# Faz commit das alterações em data/ e envia, tentando de novo se outro job empurrou entretanto.
set -euo pipefail
msg="${1:-dados: atualização}"
git config user.name "sobrerodas-bot"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add data
if git diff --cached --quiet; then
  echo "sem alterações"
  exit 0
fi
git commit -q -m "$msg ($(date -u +%Y-%m-%dT%H:%MZ))"
branch="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
for i in 1 2 3 4; do
  if git pull -q --rebase -X theirs origin "$branch" && git push -q origin "HEAD:$branch"; then
    echo "enviado"
    exit 0
  fi
  sleep $((2 ** i))
done
echo "falhou o envio" >&2
exit 1
