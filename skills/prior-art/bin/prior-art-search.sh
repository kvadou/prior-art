#!/usr/bin/env bash
# Compatibility launcher. Requires Node >=22.18 (native TypeScript support).
# Existing options: -n TOP -s MIN_STARS -o OUTDIR -k KEYWORDS -S HOSTS
# Bounds: -p MAX_PAGES -t TIMEOUT_SECONDS -r RETRIES
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$HERE/search-cli.ts" repos "$@"
