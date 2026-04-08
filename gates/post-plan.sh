#!/usr/bin/env bash
set -euo pipefail

# post-plan.sh — Olivia
# Verifies the plan artifact exists, contains required sections,
# and includes an acceptance criteria mapping back to the spec.
# Called by Forge after the plan stage completes.

TASK_ID="${FORGE_TASK_ID:?FORGE_TASK_ID env var not set}"
PLAN_FILE="${FORGE_PLAN_PATH:-_forge/plans/${TASK_ID}.md}"
if [[ "$PLAN_FILE" == *.json && ! -f "$PLAN_FILE" ]]; then
  MD_FALLBACK="${PLAN_FILE%.json}.md"
  [[ -f "$MD_FALLBACK" ]] && PLAN_FILE="$MD_FALLBACK"
fi
SPEC_FILE="${FORGE_SPEC_PATH:-_forge/specs/${TASK_ID}.md}"
if [[ "$SPEC_FILE" == *.json && ! -f "$SPEC_FILE" ]]; then
  MD_FALLBACK="${SPEC_FILE%.json}.md"
  [[ -f "$MD_FALLBACK" ]] && SPEC_FILE="$MD_FALLBACK"
fi

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "FAIL: Plan file not found: $PLAN_FILE"
  exit 1
fi

MISSING=()

for section in "## Implementation Steps" "## Acceptance Criteria Mapping"; do
  if ! grep -qi "^${section}" "$PLAN_FILE"; then
    MISSING+=("$section")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "FAIL: Plan missing required sections:"
  for s in "${MISSING[@]}"; do
    echo "  - $s"
  done
  exit 1
fi

# If a spec exists (standard flow), verify the plan references it
if [[ -f "$SPEC_FILE" ]]; then
  if ! grep -qi "spec" "$PLAN_FILE"; then
    echo "FAIL: Plan does not reference the spec. The Acceptance Criteria Mapping must trace back to spec criteria."
    exit 1
  fi
fi

echo "PASS: Plan file exists with all required sections."
exit 0

