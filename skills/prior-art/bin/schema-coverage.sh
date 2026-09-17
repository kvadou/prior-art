#!/usr/bin/env bash
# schema-coverage.sh: measure how many models in a Prisma schema carry a given
# column family, across many public repos at once. Turns a CONTESTED row into a
# number: "what share of a mature app's tables carry the tenant key?"
#
# Usage:
#   schema-coverage.sh [-p 'regex'] owner/repo:path/to/schema.prisma ...
#   schema-coverage.sh -p '(deletedAt|archivedAt)' calcom/cal.diy:packages/prisma/schema.prisma
# Default pattern: the tenant-key family.
# Reads raw files from GitHub; no clone. Prisma only (add Rails schema.rb on request).
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
PAT='(organizationId|orgId|teamId|workspaceId|tenantId|projectId|accountId|org_id|team_id|tenant_id|workspace_id)'
while getopts "p:" opt; do case "$opt" in p) PAT="$OPTARG" ;; *) exit 2 ;; esac; done
shift $((OPTIND - 1))
[ "$#" -gt 0 ] || { sed -n '2,10p' "$0"; exit 2; }

printf '| %-28s | %6s | %8s | %5s |\n' "Repo" "Models" "Matching" "Ratio"
printf '|%s|%s|%s|%s|\n' "$(printf '%.0s-' {1..30})" "--------" "----------" "-------"
for spec in "$@"; do
  repo="${spec%%:*}"; path="${spec#*:}"
  f="$(curl -sfL --max-time 25 "https://raw.githubusercontent.com/$repo/HEAD/$path" || true)"
  if [ -z "$f" ]; then printf '| %-28s | %6s | %8s | %5s |\n' "$repo" "-" "no file" "-"; continue; fi
  total="$(printf '%s\n' "$f" | grep -cE '^model ' || true)"
  hit="$(printf '%s\n' "$f" | awk -v pat="^[[:space:]]+${PAT}[[:space:]]" '
    /^model /{m=$2; inm=1} inm && $0 ~ pat {seen[m]=1} /^\}/{inm=0}
    END{n=0; for(k in seen) n++; print n}')"
  printf '| %-28s | %6s | %8s | %4s%% |\n' "$repo" "$total" "$hit" "$(( total>0 ? hit*100/total : 0 ))"
done
echo
echo "_Ratio = models with at least one column matching /${PAT}/ over all models. Column naming varies (snake_case, custom names); a 0% row is a naming miss until you open the file._"
