#!/usr/bin/env bash
# phase-gate.sh — INV-2 (role boundary) + INV-3 (D-ID cross-reference) checks.
#
# Usage:
#   bash scripts/phase-gate.sh              — run both (no role check)
#   bash scripts/phase-gate.sh <role>       — run INV-2 for <role> + INV-3
#   bash scripts/phase-gate.sh --inv3-only  — run only INV-3
#
# Roles: pm, architect, build, test
#   pm        → tasks/, docs/PRODUCT.md, docs/PM-ROLE.md
#   architect → docs/ only
#   build     → public/ only
#   test      → tests/ only

set -euo pipefail

DECISIONS="docs/DECISIONS.md"
ARCHITECTURE="docs/ARCHITECTURE.md"
ERRORS=0
ROLE="${1:-}"

# Determine project subdirectory — handles both in-tree and standalone runs
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_DIR")"
# Strip REPO_ROOT prefix from paths for matching
PREFIX="${PROJECT_DIR#$REPO_ROOT/}"
[ -z "$PREFIX" ] && PREFIX=""
[ -n "$PREFIX" ] && PREFIX="$PREFIX/"

# ── Help ────────────────────────────────────────────────────────────
if [ "$ROLE" = "-h" ] || [ "$ROLE" = "--help" ]; then
  sed -n '2,12p' "$0"
  exit 0
fi

# ── INV-2: Role boundary check ──────────────────────────────────────
if [ -n "$ROLE" ] && [ "$ROLE" != "--inv3-only" ]; then

  # Resolve allowed path(s) for the role
  case "$ROLE" in
    pm)        ALLOWED="^${PREFIX}(tasks/|docs/|scripts/phase-gate\\.sh|scripts/agent\\.sh|BLUEPRINT\\.md|CLAUDE\\.md|AGENTS\\.md|README\\.md|\\.opencode/prompts/)" ;;
    architect) ALLOWED="^${PREFIX}docs/" ;;
    build)     ALLOWED="^${PREFIX}public/" ;;
    test)      ALLOWED="^${PREFIX}tests/" ;;
    *)
      echo "GATE FAIL: Unknown role '$ROLE'. Valid: pm, architect, build, test"
      exit 1
      ;;
  esac

  echo "--- INV-2 Gate: $ROLE boundary check (allowed: $ALLOWED) ---"

  # Get changed files relative to repo root
  CHANGED=$(git diff --name-only HEAD 2>/dev/null || git diff --name-only 2>/dev/null || true)

  if [ -z "$CHANGED" ]; then
    echo "  No uncommitted changes to check."
  else
    VIOLATIONS=$(echo "$CHANGED" | { grep -vE "$ALLOWED" || true; })

    if [ -n "$VIOLATIONS" ]; then
      echo "  FAIL — $ROLE touched files outside allowed paths:"
      echo "$VIOLATIONS" | sed 's/^/    /'
      ERRORS=$((ERRORS + 1))
    else
      echo "  PASS — all changed files are within allowed paths."
    fi
  fi
fi

# ── INV-3: D-ID cross-reference check ──────────────────────────────
echo ""
echo "--- INV-3 Gate: D-ID cross-reference check ---"

# Extract all D-IDs from DECISIONS.md (lines like "## D-01:")
D_IDS=$(grep -oE '^## D-[0-9]+' "$DECISIONS" | sed 's/^## //')

for DID in $D_IDS; do
  # Skip documentation-only decisions
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

# ── Summary ─────────────────────────────────────────────────────────
echo "---"
if [ $ERRORS -eq 0 ]; then
  echo "ALL GATES PASSED"
  exit 0
else
  echo "GATE(S) FAILED — $ERRORS error(s) above"
  exit 1
fi
