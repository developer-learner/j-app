#!/usr/bin/env bash
# agent.sh — invoke an agent then run the INV-2 + INV-3 gate.
# Usage:
#   bash scripts/agent.sh pm "Write a PRD for..."
#   bash scripts/agent.sh architect "Design the data model..."
#   bash scripts/agent.sh build "Implement the form..."
#   bash scripts/agent.sh test "Write tests..."
#
# The gate fires immediately after the agent finishes, before any commit.
# If the agent crossed a role boundary, the gate exits non-zero and the
# handoff is blocked.

set -euo pipefail

AGENT="$1"
shift

echo "=== Agent: $AGENT ==="
opencode run --agent "$AGENT" "$@"

echo ""
echo "=== Gate: $AGENT ==="
bash scripts/phase-gate.sh "$AGENT"
