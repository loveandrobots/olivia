#!/usr/bin/env bash
set -euo pipefail

# post-spec.sh — Olivia
# Verifies the spec artifact exists and contains required sections.
# Called by Forge after the spec stage completes.

TASK_ID="${FORGE_TASK_ID:?FORGE_TASK_ID env var not set}"
SPEC_FILE="${FORGE_SPEC_PATH:-_forge/specs/${TASK_ID}.md}"
# If forge set a .json path but the file doesn't exist, try .md fallback
if [[ "$SPEC_FILE" == *.json && ! -f "$SPEC_FILE" ]]; then
  MD_FALLBACK="${SPEC_FILE%.json}.md"
  [[ -f "$MD_FALLBACK" ]] && SPEC_FILE="$MD_FALLBACK"
fi

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "FAIL: Spec file not found: $SPEC_FILE"
  exit 1
fi

MISSING=()

# Required sections — every spec must have these
for section in "## Problem" "## Acceptance Criteria" "## Scope"; do
  if ! grep -qi "^${section}" "$SPEC_FILE"; then
    MISSING+=("$section")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "FAIL: Spec missing required sections:"
  for s in "${MISSING[@]}"; do
    echo "  - $s"
  done
  exit 1
fi

echo "PASS: Spec file exists with all required sections."
exit 0

