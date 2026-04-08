#!/usr/bin/env bash
set -euo pipefail

# post-review.sh — Olivia
# Verifies the review artifact exists and contains a verdict.
# The verdict line determines whether the task advances or bounces.
# Called by Forge after the review stage completes.
#
# IMPORTANT: Check only the verdict line, not the full file body.
# Positive reviews that mention "tests pass" were triggering false
# failures on whole-file grep for "PASS" in the Forge project.

TASK_ID="${FORGE_TASK_ID:?FORGE_TASK_ID env var not set}"
REVIEW_FILE="${FORGE_REVIEW_PATH:-_forge/reviews/${TASK_ID}.md}"

if [[ ! -f "$REVIEW_FILE" ]]; then
  echo "FAIL: Review file not found: $REVIEW_FILE"
  exit 1
fi

# Extract the verdict line (case-insensitive match for "verdict:")
VERDICT_LINE=$(grep -i "^##\?\s*verdict" "$REVIEW_FILE" || true)

if [[ -z "$VERDICT_LINE" ]]; then
  # Also check for "Verdict:" without heading markup
  VERDICT_LINE=$(grep -i "^\*\*verdict\*\*\|^verdict:" "$REVIEW_FILE" || true)
fi

if [[ -z "$VERDICT_LINE" ]]; then
  echo "FAIL: Review file has no verdict line."
  exit 1
fi

# Check the verdict value on the line (or the line immediately after the heading)
# Accept PASS/APPROVED/LGTM as passing, ISSUES/FAIL/REJECT as bouncing
VERDICT_BLOCK=$(grep -iA1 "verdict" "$REVIEW_FILE" | head -3)

if echo "$VERDICT_BLOCK" | grep -qi "PASS\|APPROVED\|LGTM"; then
  echo "PASS: Review verdict is positive."
  exit 0
elif echo "$VERDICT_BLOCK" | grep -qi "ISSUES\|FAIL\|REJECT"; then
  echo "BOUNCE: Review found issues. Routing back to implement stage."
  exit 1
else
  echo "FAIL: Could not determine review verdict from: $VERDICT_BLOCK"
  exit 1
fi

