#!/usr/bin/env bash
# Write version.json from current git commit so clients always load fresh assets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SHA="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
# dirty tree → append timestamp so uncommitted audio/js still busts cache
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  SHA="${SHA}-$(date +%Y%m%d%H%M%S)"
fi
TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > version.json <<EOF
{
  "v": "${SHA}",
  "time": "${TIME}",
  "note": "Fetched with ?_=Date.now() every page load — do not hardcode asset versions in HTML"
}
EOF

echo "stamped version.json → v=${SHA} (${TIME})"
