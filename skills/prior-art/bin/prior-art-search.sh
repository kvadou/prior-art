#!/usr/bin/env bash
# prior-art-search.sh: survey public GitHub for existing implementations before building.
# Usage: prior-art-search.sh [-n TOP] [-s MIN_STARS] [-o OUTDIR] "query one" "query two" ...
# Requires: gh (authenticated), jq
set -euo pipefail

TOP=25
MIN_STARS=50
KEYWORDS=""
SOURCES="github"
# Default: docs/prior-art/ at the root of the current git repo, else ~/.prior-art
_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
OUTDIR="${PRIOR_ART_OUT:-${_root:+$_root/docs/prior-art}}"
OUTDIR="${OUTDIR:-$HOME/.prior-art}"

while getopts "n:s:o:k:S:" opt; do
  case "$opt" in
    n) TOP="$OPTARG" ;;
    s) MIN_STARS="$OPTARG" ;;
    o) OUTDIR="$OPTARG" ;;
    k) KEYWORDS="$OPTARG" ;;
    S) SOURCES="$OPTARG" ;;   # comma list: github,gitlab,codeberg
    *) echo "usage: $0 [-n TOP] [-s MIN_STARS] [-k \"kw1|kw2\"] [-S github,gitlab,codeberg] [-o OUTDIR] \"query\" ..." >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

if [ "$#" -eq 0 ]; then
  echo "error: give at least one search query" >&2
  exit 2
fi
command -v gh >/dev/null || { echo "error: gh CLI not installed" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq not installed" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: gh not authenticated (run: gh auth login)" >&2; exit 1; }

STAMP="$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$OUTDIR"
RAW="$(mktemp)"
trap 'rm -f "$RAW" "$RAW".*' EXIT

if [ -z "$KEYWORDS" ]; then
  KEYWORDS="$(printf '%s ' "$@" | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9-' '\n' \
    | grep -Ev '^(topic|language|stars|org|user|in|is|the|a|an|and|or|for|with|of|to|open|source|system|app|tool|platform|)$' \
    | sort -u | paste -sd'|' -)"
fi
echo "relevance keywords: $KEYWORDS" >&2

CUTOFF="$(date -v-18m +%Y-%m-%d 2>/dev/null || date -d '18 months ago' +%Y-%m-%d)"

# Strip GitHub-only qualifiers (topic:, language:) for hosts that do not understand them.
plain() { printf '%s' "$1" | sed -E 's/\b(topic|language|org|user|in):[^ ]+//g; s/  +/ /g; s/^ //; s/ $//'; }

for q in "$@"; do
  case ",$SOURCES," in *,github,*)
    echo "searching github: $q" >&2
    gh api -X GET search/repositories \
      -f q="$q stars:>=$MIN_STARS" \
      -f sort=stars -f order=desc -f per_page=50 \
      --jq '.items[] | {full_name, html_url, description, stars: .stargazers_count, forks: .forks_count, language, license: (.license.spdx_id // "NONE"), pushed_at, archived, topics, host: "github"}' \
      >> "$RAW" 2>/dev/null || echo "  (github query failed, skipping)" >&2
    sleep 2 ;;
  esac
  case ",$SOURCES," in *,gitlab,*)
    pq="$(plain "$q")"; [ -n "$pq" ] || continue
    echo "searching gitlab: $pq" >&2
    # GitLab stars run ~10x lower than GitHub for equivalent projects; MIN_STARS/10 keeps recall.
    curl -s --max-time 30 "https://gitlab.com/api/v4/projects?search=$(jq -rn --arg s "$pq" '$s|@uri')&order_by=star_count&sort=desc&per_page=50&visibility=public&simple=false" \
      | jq -c --argjson min "$((MIN_STARS / 10))" '.[] | select(.star_count >= $min) | {full_name: .path_with_namespace, html_url: .web_url, description, stars: .star_count, forks: (.forks_count // 0), language: null, license: (.license.nickname // .license.key // "NONE" | ascii_upcase), pushed_at: .last_activity_at, archived: (.archived // false), topics: (.topics // []), host: "gitlab"}' \
      >> "$RAW" 2>/dev/null || echo "  (gitlab query failed, skipping)" >&2
    sleep 1 ;;
  esac
  case ",$SOURCES," in *,codeberg,*)
    pq="$(plain "$q")"; [ -n "$pq" ] || continue
    echo "searching codeberg: $pq" >&2
    curl -s --max-time 30 "https://codeberg.org/api/v1/repos/search?q=$(jq -rn --arg s "$pq" '$s|@uri')&sort=stars&order=desc&limit=50" \
      | jq -c --argjson min "$((MIN_STARS / 10))" '.data[] | select(.stars_count >= $min) | {full_name, html_url, description, stars: .stars_count, forks: .forks_count, language, license: "NONE", pushed_at: .updated_at, archived, topics: [], host: "codeberg"}' \
      >> "$RAW" 2>/dev/null || echo "  (codeberg query failed, skipping)" >&2
    sleep 1 ;;
  esac
done

[ -s "$RAW" ] || { echo "no results" >&2; exit 1; }

JSON="$OUTDIR/$STAMP-results.json"
jq -s --arg cutoff "$CUTOFF" --arg kw "$KEYWORDS" '
  unique_by(.full_name)
  | map(. + {
      maintained: (.pushed_at[0:10] >= $cutoff and (.archived | not)),
      hits: ([ ($kw | split("|") | .[]) as $k
               | (((.description // "") + " " + (.topics | join(" ")) + " " + .full_name) | ascii_downcase)
               | select(test("(^|[^a-z])" + $k)) | $k ] | unique | length),
      license_class: (
        if   (.license | test("^(MIT|Apache-2.0|BSD-2-Clause|BSD-3-Clause|ISC|MPL-2.0|Unlicense|0BSD)$")) then "permissive"
        elif (.license | test("^(GPL|AGPL|LGPL)")) then "copyleft"
        else "unknown-or-none" end)
    })
  | map(. + { relevant: (.hits >= 2) })
  | map(. + { score: (
        ([(.stars | log), 9.5] | min) * 8
      + ([.hits, 4] | min) * 15
      + (if .relevant then 0 else -70 end)
      + (if .maintained then 25 else 0 end)
      + (if .license_class == "permissive" then 20 elif .license_class == "copyleft" then 5 else 0 end)
      + ((.forks + 1) | log) * 3
    ) | floor })
  | sort_by(-.score)
' "$RAW" > "$JSON"

MD="$OUTDIR/$STAMP-report.md"
{
  echo "# Prior art survey, $STAMP"
  echo
  echo "Queries: $*  ·  Sources: $SOURCES"
  echo
  echo "Filters: stars >= $MIN_STARS · maintained = pushed since $CUTOFF · $(jq 'length' "$JSON") unique repos found"
  echo
  echo "| # | Repo | Host | Stars | Lang | License | Maintained | Rel | Score |"
  echo "|---|------|------|-------|------|---------|-----------|-----|-------|"
  jq -r --argjson top "$TOP" '.[:$top] | to_entries[] |
    "| \(.key+1) | [\(.value.full_name)](\(.value.html_url)) | \(.value.host) | \(.value.stars) | \(.value.language // "-") | \(.value.license) | \(if .value.maintained then "yes" else "NO" end) | \(if .value.relevant then "y" else "n" end) | \(.value.score) |"' "$JSON"
  echo
  echo "## Candidates"
  echo
  jq -r --argjson top "$TOP" '.[:$top][] |
    "### \(.full_name)\n\n\(.description // "(no description)")\n\n- \(.html_url)\n- \(.stars) stars, \(.forks) forks, \(.language // "unknown"), license \(.license) (\(.license_class))\n- last push \(.pushed_at[0:10])\(if .archived then ", ARCHIVED" else "" end)\n- topics: \(.topics | join(", "))\n"' "$JSON"
} > "$MD"

echo "$MD"
