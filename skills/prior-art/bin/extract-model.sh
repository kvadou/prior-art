#!/usr/bin/env bash
# extract-model.sh: fingerprint an existing app's domain model for prior-art comparison.
# Usage: extract-model.sh [REPO_DIR]
# Emits a condensed markdown fingerprint on stdout. Read-only. Never writes to the repo.
set -euo pipefail
REPO="${1:-$PWD}"
cd "$REPO"

say() { printf '%s\n' "$*"; }
# grep that never trips set -e on no-match
g() { grep "$@" 2>/dev/null || true; }
# grep a NUL-delimited file list without ever failing the pipeline: grep exits 1 on
# no-match, xargs turns that into 123, and `set -o pipefail` would abort the script.
xg() { local list="$1"; shift; tr '\n' '\0' < "$list" | xargs -0 grep "$@" 2>/dev/null || true; }

EXCL='--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=vendor --exclude-dir=venv --exclude-dir=__pycache__ --exclude-dir=coverage'

say "# Domain model fingerprint, $(basename "$REPO")"
say
say "Generated $(date +%Y-%m-%d) from \`$REPO\`"
say

# ---------- stack ----------
say "## Stack"
say
STACK=""
if [ -f package.json ]; then STACK="$STACK node"; fi
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then STACK="$STACK python"; fi
if [ -f Gemfile ]; then STACK="$STACK ruby"; fi
if [ -f composer.json ]; then STACK="$STACK php"; fi
if [ -f go.mod ]; then STACK="$STACK go"; fi
if [ -f Cargo.toml ]; then STACK="$STACK rust"; fi
say "- detected: ${STACK:- unknown}"
if [ -f package.json ]; then
  say "- key deps: $(jq -r '((.dependencies // {}) + (.devDependencies // {})) | keys | map(select(test("^(next|react|vue|svelte|express|fastify|nestjs|prisma|drizzle-orm|typeorm|sequelize|knex|mongoose|@supabase/supabase-js|stripe|next-auth|@auth/core|lucia|passport)"))) | join(", ")' package.json 2>/dev/null || echo "(unreadable)")"
fi
say

# ---------- schema source ----------
say "## Schema source"
say
SCHEMA_FILES="$(find . -maxdepth 4 \( -path ./node_modules -o -path ./.git -o -path ./vendor -o -path ./.next -o -path ./.worktrees -o -path './*/node_modules' \) -prune -o \
  \( -name 'schema.prisma' -o -name 'schema.rb' -o -name 'structure.sql' -o -name 'schema.sql' \) -print 2>/dev/null | head -5)"
MIGRATION_DIRS="$(find . -maxdepth 4 -type d \( -name migrations -o -name migrate \) -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.worktrees/*' -not -path '*/vendor/*' 2>/dev/null | head -5)"
MODEL_DIRS="$(find . -maxdepth 4 -type d \( -name models -o -name entities -o -name schema \) -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.worktrees/*' -not -path '*/vendor/*' 2>/dev/null | head -5)"
say "- canonical schema: ${SCHEMA_FILES:-none found}"
say "- migration dirs: ${MIGRATION_DIRS:-none}"
say "- model dirs: ${MODEL_DIRS:-none}"
if [ -n "$MIGRATION_DIRS" ]; then say "- migration count: $(find $MIGRATION_DIRS -type f \( -name '*.sql' -o -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.rb' \) 2>/dev/null | wc -l | tr -d ' ')"; fi
say

# ---------- entities ----------
say "## Entities"
say
ENTITIES=""
PRISMA="$(printf '%s\n' "$SCHEMA_FILES" | g -m1 'schema\.prisma' | head -1)"
if [ -n "$PRISMA" ] && [ -f "$PRISMA" ]; then
  ENTITIES="$(g -E '^[[:space:]]*model[[:space:]]+[A-Za-z_]' "$PRISMA" \
    | sed -E 's/^[[:space:]]*model[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/' | sort -u)"
elif [ -n "$MIGRATION_DIRS$MODEL_DIRS" ]; then
  # Bound the scan: big repos have thousands of migrations and an unbounded
  # recursive grep here is what makes this tool hang instead of degrade.
  SCAN_CAP="${PRIOR_ART_SCAN_CAP:-400}"
  SCANLIST="$(mktemp)"
  find $MIGRATION_DIRS $MODEL_DIRS -type f \
       \( -name '*.sql' -o -name '*.rb' -o -name '*.py' -o -name '*.ts' -o -name '*.js' \) \
       -not -path '*/node_modules/*' 2>/dev/null | head -"$SCAN_CAP" > "$SCANLIST"
  SCANNED="$(g -c . "$SCANLIST" || echo 0)"
  if [ "$SCANNED" -gt 0 ]; then
    ENTITIES="$( { xg "$SCANLIST" -hoiE 'create table (if not exists )?([a-z_]+\.)?[`"'"'"']?[a-z_][a-z0-9_]*' \
                     | sed -E 's/.*[tT][aA][bB][lL][eE] //; s/^(if not exists )//I; s/^[a-z_]+\.//' | tr -d "\`\"'"
                   xg "$SCANLIST" -hoE '^[[:space:]]*class[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(.*(Model|Base|db\.Model)' \
                     | sed -E 's/^[[:space:]]*class[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/'
                   xg "$SCANLIST" -hoE '^[[:space:]]*class[[:space:]]+[A-Za-z_][A-Za-z0-9_:]*[[:space:]]*<[[:space:]]*(ApplicationRecord|ActiveRecord::Base)' \
                     | sed -E 's/^[[:space:]]*class[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/'
                   xg "$SCANLIST" -hoE 'export const [A-Za-z_][A-Za-z0-9_]* = (pgTable|mysqlTable|sqliteTable)' \
                     | sed -E 's/export const ([A-Za-z_][A-Za-z0-9_]*).*/\1/'
                 } | sed 's/^ *//' | sort -u | g -v '^$')"
  fi
  rm -f "$SCANLIST"
  if [ "${SCANNED:-0}" -ge "$SCAN_CAP" ]; then SCAN_TRUNCATED=1; fi
fi
N="$(printf '%s\n' "$ENTITIES" | g -c . || true)"
say "Count: ${N:-0}"
if [ -n "${SCAN_TRUNCATED:-}" ]; then say "_(scan capped at $SCAN_CAP migration/model files; raise with PRIOR_ART_SCAN_CAP)_"; fi
say
ENT_CAP="${PRIOR_ART_ENTITY_CAP:-60}"
if [ -n "$ENTITIES" ]; then
  printf '%s\n' "$ENTITIES" | head -"$ENT_CAP" | sed 's/^/- /'
  if [ "${N:-0}" -gt "$ENT_CAP" ] 2>/dev/null; then
    say "- _... and $((N - ENT_CAP)) more (raise with PRIOR_ART_ENTITY_CAP)_"
    say
    say "**A schema this size is itself a finding.** Cluster these into bounded contexts before comparing."
  fi
else
  say "_No entities auto-extracted. Locate the schema by hand before comparing._"
fi
say

# ---------- bounded source file list (built once; big repos must stay fast) ----------
FILELIST="$(mktemp)"; trap 'rm -f "$FILELIST"' EXIT
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git ls-files 2>/dev/null
else
  find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' \
    -not -path '*/vendor/*' -not -path '*/dist/*' -not -path '*/.worktrees/*' 2>/dev/null
fi | g -E '\.(ts|tsx|js|jsx|mjs|py|rb|php|go|rs|java|kt|sql|prisma|graphql)$' \
   | g -vE '(^|/)(node_modules|dist|build|\.next|coverage|vendor|\.worktrees)/' > "$FILELIST"
NFILES="$(g -c . "$FILELIST" || echo 0)"

# ---------- design signals ----------
say "## Design signals"
say
say "Presence of the patterns that are expensive to retrofit, across $NFILES source files."
say
# -i: schemas use camelCase (stripeCustomerId) and SQL uses snake_case; match both.
sig() { printf '| %s | %s |\n' "$1" "$(xg "$FILELIST" -lIEi "$2" | wc -l | tr -d ' ')"; }
say "| Signal | Files |"
say "|---|---|"
sig "soft delete (deletedAt/deleted_at)"      'deleted_?[Aa]t'
sig "tenancy column (tenant/org/account id)"  '(tenant|organization|organisation|account|workspace|company)_?[Ii]d'
sig "audit trail (createdBy/updatedBy)"       '(created|updated|modified)_?[Bb]y'
sig "timestamps (createdAt)"                  'created_?[Aa]t'
sig "versioning (version/revision/effective)" '(version|revision|effective_?(from|date)|valid_?(from|until))'
sig "money as integer cents"                  '(amount_?cents|price_?cents|_?in_?cents|unit_?amount)'
sig "money as float/decimal"                  '(Float|Decimal|NUMERIC|DOUBLE).*(price|amount|cost|fee|total)'
sig "idempotency keys"                        'idempotenc'
sig "role / permission model"                 '(role|permission|abilit|policy|rbac|casl)'
sig "status enums"                            '(enum .*[Ss]tatus|status: *[\"'"'"']|STATUS_)'
sig "external ids (stripe/provider)"          '(stripe_?[a-z_]*id|external_?id|provider_?id)'
sig "webhooks"                                'webhook'
sig "background jobs / queue"                 '(inngest|bullmq|sidekiq|celery|cron|queue|worker)'
sig "feature flags"                           '(feature_?flag|launchdarkly|unleash|flagsmith)'
printf '| %s | %s |\n' "test files" "$(g -cE '\.(test|spec)\.[jt]sx?$|_test\.py$|_spec\.rb$|(^|/)(tests?|spec)/' "$FILELIST" || echo 0)"
say

# ---------- scale ----------
say "## Scale"
say
say "- tracked files: $(git ls-files 2>/dev/null | wc -l | tr -d ' ')"
say "- source files scanned: $NFILES"
say "- code lines (rough): $( (tr '\n' '\0' < "$FILELIST" | xargs -0 wc -l 2>/dev/null || true) | tail -1 | awk '{print $1}')"
say "- first commit: $(git log --reverse --format=%ad --date=short 2>/dev/null | head -1)"
say "- last commit: $(git log -1 --format=%ad --date=short 2>/dev/null)"
say "- contributors: $(git shortlog -sn --all 2>/dev/null | wc -l | tr -d ' ')"
say
say "---"
say "_Fingerprint only. It says what exists, never whether it is right. The comparison against prior art does that._"
