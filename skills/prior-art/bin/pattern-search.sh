#!/usr/bin/env bash
# pattern-search.sh: search CODE CONTENT across public repos for a schema pattern.
# Finds convergence evidence directly (who models X this way) instead of finding
# projects by topic and hoping. Two engines:
#   sourcegraph  regex over GitHub+GitLab+others, no auth       (default)
#   github       GitHub code search, keyword + filename:/extension:, needs `gh auth`
#
# Usage:
#   pattern-search.sh <pattern-name>                 # from references/patterns.tsv
#   pattern-search.sh -q '<raw query>' [-e engine]   # ad hoc
#   pattern-search.sh -l                             # list library patterns
#   pattern-search.sh -d <decision>                  # run every pattern for a decision
# Options: -n TOP (default 15)  -o OUTDIR  -e sourcegraph|github
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$HERE/../references/patterns.tsv"
TOP=15; ENGINE=""; QUERY=""; NAME=""; DECISION=""; LIST=0
_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
OUTDIR="${PRIOR_ART_OUT:-${_root:+$_root/docs/prior-art}}"; OUTDIR="${OUTDIR:-$HOME/.prior-art}"

while getopts "n:o:e:q:d:l" opt; do
  case "$opt" in
    n) TOP="$OPTARG" ;; o) OUTDIR="$OPTARG" ;; e) ENGINE="$OPTARG" ;;
    q) QUERY="$OPTARG" ;; d) DECISION="$OPTARG" ;; l) LIST=1 ;;
    *) sed -n '2,12p' "$0"; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
command -v jq >/dev/null || { echo "error: jq required" >&2; exit 1; }

if [ "$LIST" = 1 ]; then
  awk -F'\t' '!/^#/ {printf "%-32s %-12s %-11s %s\n", $1, $2, $3, $5}' "$LIB"; exit 0
fi

# Resolve what to run: a list of "name<TAB>engine<TAB>query<TAB>evidence" lines
if [ -n "$QUERY" ]; then
  RUNS="$(printf 'adhoc\t%s\t%s\tad hoc query\n' "${ENGINE:-sourcegraph}" "$QUERY")"
elif [ -n "$DECISION" ]; then
  RUNS="$(awk -F'\t' -v d="$DECISION" '!/^#/ && $2==d {print $1"\t"$3"\t"$4"\t"$5}' "$LIB")"
  [ -n "$RUNS" ] || { echo "error: no patterns for decision '$DECISION' (see -l)" >&2; exit 1; }
else
  NAME="${1:-}"; [ -n "$NAME" ] || { sed -n '2,12p' "$0"; exit 2; }
  RUNS="$(awk -F'\t' -v n="$NAME" '!/^#/ && $1==n {print $1"\t"$3"\t"$4"\t"$5}' "$LIB")"
  [ -n "$RUNS" ] || { echo "error: unknown pattern '$NAME' (see -l)" >&2; exit 1; }
fi
[ -n "$ENGINE" ] && RUNS="$(printf '%s\n' "$RUNS" | awk -F'\t' -v e="$ENGINE" 'BEGIN{OFS="\t"} {$2=e; print}')"

urlenc() { jq -rn --arg s "$1" '$s|@uri'; }

# Each engine emits JSON lines: {repo, path, stars, line, snippet}
run_sourcegraph() {
  local q="$1"
  curl -s --max-time 45 -H 'Accept: text/event-stream' \
    "https://sourcegraph.com/.api/search/stream?q=$(urlenc "$q count:200")&display=200" \
  | awk '/^event: matches/{getline; print substr($0,7)}' \
  | jq -c '.[] | select(.type=="content") |
      {repo: (.repository | sub("^github.com/";"")),
       host: (.repository | split("/")[0]),
       path, stars: (.repoStars // 0),
       line: (.chunkMatches[0].contentStart.line // .lineMatches[0].lineNumber // null),
       snippet: ((.chunkMatches[0].content // .lineMatches[0].line // "") | gsub("\n";" ") | .[0:110])}' 2>/dev/null || true
}

run_github() {
  local q="$1"
  gh auth status >/dev/null 2>&1 || { echo "error: github engine needs gh auth" >&2; return 0; }
  gh api -X GET search/code -f q="$q" -f per_page=100 \
    --jq '.items[] | {repo: .repository.full_name, host: "github.com", path, stars: null, line: null, snippet: ""}' 2>/dev/null \
  | jq -c . || true
}

mkdir -p "$OUTDIR"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
JSONL="$(mktemp)"; trap 'rm -f "$JSONL"' EXIT

while IFS=$'\t' read -r name engine query evidence; do
  [ -n "$name" ] || continue
  echo "[$engine] $name: $query" >&2
  case "$engine" in
    sourcegraph) run_sourcegraph "$query" ;;
    github)      run_github "$query" ;;
    *) echo "  unknown engine '$engine', skipped" >&2; continue ;;
  esac | jq -c --arg n "$name" --arg ev "$evidence" '. + {pattern: $n, evidence: $ev}' >> "$JSONL"
  sleep 1
done <<< "$RUNS"

[ -s "$JSONL" ] || { echo "no matches" >&2; exit 1; }

# GitHub engine has no stars; look up unique repos (capped) so ranking is comparable.
NEED="$(jq -r 'select(.stars==null) | .repo' "$JSONL" | sort -u | head -40)"
STARS="{}"
if [ -n "$NEED" ] && gh auth status >/dev/null 2>&1; then
  while read -r r; do
    s="$(gh api "repos/$r" --jq '.stargazers_count' 2>/dev/null || echo 0)"
    STARS="$(jq -c --arg r "$r" --argjson s "${s:-0}" '. + {($r): $s}' <<< "$STARS")"
  done <<< "$NEED"
fi

OUT="$OUTDIR/$STAMP-pattern-${NAME:-${DECISION:-adhoc}}.md"
jq -s --argjson stars "$STARS" --argjson top "$TOP" '
  map(.stars = (if .stars==null then ($stars[.repo] // 0) else .stars end))
  | group_by(.pattern)
  | map({pattern: .[0].pattern, evidence: .[0].evidence,
         repos: (group_by(.repo) | map({repo: .[0].repo, host: .[0].host, stars: .[0].stars,
                  files: (map(.path) | unique | length), path: .[0].path, line: .[0].line, snippet: .[0].snippet})
                 | sort_by(-.stars))})
' "$JSONL" > "$JSONL.agg"

{
  echo "# Pattern search: ${NAME:-${DECISION:-ad hoc}} ($STAMP)"
  echo
  jq -r --argjson top "$TOP" '.[] |
    "## \(.pattern)\n\n_Evidence of: \(.evidence)_  \nRepos matching: **\(.repos|length)** (showing top \($top) by stars)\n\n| Repo | Stars | Files | Example | Snippet |\n|---|---|---|---|---|\n" +
    ( .repos[:$top] | map("| \(.repo) | \(.stars) | \(.files) | `\(.path)\(if .line then ":"+(.line|tostring) else "" end)` | \(.snippet|gsub("\\|";"\\\\|")) |") | join("\n") ) + "\n"' "$JSONL.agg"
  echo
  echo "_Counts are repos that contain the pattern at least once. A high count is convergence evidence; open the top few to confirm the pattern means what the query assumes._"
  if grep -q '"host":"github.com"' "$JSONL" 2>/dev/null; then
    echo
    echo "_GitHub engine rows: GitHub code search returns its first 100 matches by relevance, not by stars, and gives no snippet. Treat the count as a floor and the star order as a sample. Use the sourcegraph engine for ranked, regex-capable evidence._"
  fi
} > "$OUT"
rm -f "$JSONL.agg"
echo "$OUT"
