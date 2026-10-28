#!/usr/bin/env bash
# Requires Node >=22.18 (native TypeScript support). See search-cli.ts usage.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$HERE/search-cli.ts" answers "$@"
