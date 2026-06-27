#!/usr/bin/env bash
# phase-gate.sh — Lightweight INV-3 check: every non-documentation D-ID
# in DECISIONS.md must appear in ARCHITECTURE.md.
# Usage: bash scripts/phase-gate.sh
# Returns 0 if all D-IDs are referenced, 1 otherwise.

set -euo pipefail

DECISIONS="docs/DECISIONS.md"
ARCHITECTURE="docs/ARCHITECTURE.md"
ERRORS=0

echo "--- INV-3 Gate: D-ID cross-reference check ---"

# Extract all D-IDs from DECISIONS.md (lines like "## D-01:")
D_IDS=$(grep -oE '^## D-[0-9]+' "$DECISIONS" | sed 's/^## //')

for DID in $D_IDS; do
  # Skip documentation-only decisions (they don't need to appear in ARCHITECTURE.md)
  if grep -A1 "^## $DID" "$DECISIONS" | grep -q "Documentation-only"; then
    echo "  SKIP $DID (documentation-only)"
    continue
  fi

  if grep -q "$DID" "$ARCHITECTURE"; then
    echo "  PASS $DID"
  else
    echo "  FAIL $DID — referenced in $DECISIONS but missing from $ARCHITECTURE"
    ERRORS=$((ERRORS + 1))
  fi
done

echo "---"
if [ $ERRORS -eq 0 ]; then
  echo "INV-3 GATE PASSED"
  exit 0
else
  echo "INV-3 GATE FAILED — $ERRORS D-ID(s) missing from $ARCHITECTURE"
  exit 1
fi
