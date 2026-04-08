#!/bin/bash
# Gate: post-implement — Olivia
# Runs after the implement stage. Must pass for review to begin.
# Checks: typecheck, lint, tests, brand compliance, dependency direction.
# Emits structured JSON output on stdout for richer failure context.
#
# Environment variables (set by Forge gate runner):
#   FORGE_TASK_ID      — the task identifier
#   FORGE_REPO_PATH    — path to the project repository
#   FORGE_STAGE        — current stage name
#   FORGE_ATTEMPT      — attempt number
#   FORGE_BRANCH       — feature branch name

set -uo pipefail

cd "$FORGE_REPO_PATH"

PYTHON="${FORGE_PYTHON:-$(command -v python3 || command -v python)}"

# Track individual check results as a JSON array built via Python
CHECKS='[]'
ALL_PASSED=true

add_check() {
    local name="$1"
    local passed="$2"
    local detail="$3"
    local py_passed
    if [ "$passed" = "true" ]; then py_passed="True"; else py_passed="False"; fi
    CHECKS=$("$PYTHON" -c "
import sys, json
checks = json.loads(sys.argv[1])
checks.append({'name': sys.argv[2], 'passed': $py_passed, 'detail': sys.argv[3]})
json.dump(checks, sys.stdout)
" "$CHECKS" "$name" "$detail")
    if [ "$passed" = "false" ]; then
        ALL_PASSED=false
    fi
}

# ---------- Tooling checks ----------

echo "=== TypeScript check ===" >&2
if TYPECHECK_OUTPUT=$(npm run typecheck 2>&1); then
    add_check "typecheck" "true" ""
else
    add_check "typecheck" "false" "$(echo "$TYPECHECK_OUTPUT" | tail -20)"
    echo "TypeScript check failed:" >&2
    echo "$TYPECHECK_OUTPUT" >&2
fi

echo "" >&2
echo "=== ESLint ===" >&2
if LINT_OUTPUT=$(npm run lint 2>&1); then
    add_check "lint" "true" ""
else
    add_check "lint" "false" "$(echo "$LINT_OUTPUT" | tail -20)"
    echo "Lint failed:" >&2
    echo "$LINT_OUTPUT" >&2
fi

echo "" >&2
echo "=== Tests ===" >&2
if TEST_OUTPUT=$(npm test 2>&1); then
    add_check "tests" "true" ""
else
    add_check "tests" "false" "$(echo "$TEST_OUTPUT" | tail -20)"
    echo "Tests failed:" >&2
    echo "$TEST_OUTPUT" >&2
fi

# ---------- Brand compliance checks ----------
# These enforce Olivia's brand rules mechanically.
# See docs/brand/ for the full guidelines.

echo "" >&2
echo "=== Brand compliance ===" >&2

BRAND_DETAIL=""

# Check for exclamation marks in UI-facing code
if [ -d "apps/pwa/src" ]; then
    EXCL_HITS=$(grep -rn '!' apps/pwa/src/ \
        --include='*.ts' --include='*.tsx' \
        --exclude-dir='__tests__' --exclude-dir='*.test.*' \
        | grep -v '\.test\.' \
        | grep -v '/lib/' \
        | grep -v 'node_modules' \
        | grep -v '!=\|!==\|!\.' \
        | grep -v '\/\/' \
        | grep -Ei "([\'\"\`][^'\"\`]*![^'\"\`]*[\'\"\`])" \
        || true)
    if [ -n "$EXCL_HITS" ]; then
        BRAND_DETAIL="${BRAND_DETAIL}Exclamation marks in UI strings. "
    fi
fi

# Check for forbidden phrases in UI-facing code and API responses
FORBIDDEN_PHRASES=(
    "overdue"
    "missed"
    "falling behind"
    "Don't forget"
    "Great job"
    "Keep it up"
    "You're doing amazing"
    "Well done"
    "Awesome"
    "Way to go"
    "OVERDUE"
    "URGENT"
    "WARNING"
    "ALERT"
)

for phrase in "${FORBIDDEN_PHRASES[@]}"; do
    HITS=""
    if [ -d "apps/pwa/src" ]; then
        HITS+=$(grep -rn "$phrase" apps/pwa/src/ \
            --include='*.ts' --include='*.tsx' \
            | grep -v '\.test\.' \
            | grep -v 'node_modules' \
            || true)
    fi
    if [ -d "apps/api/src" ]; then
        HITS+=$(grep -rn "$phrase" apps/api/src/ \
            --include='*.ts' \
            | grep -v '\.test\.' \
            | grep -v 'node_modules' \
            || true)
    fi
    if [ -n "$HITS" ]; then
        BRAND_DETAIL="${BRAND_DETAIL}Forbidden phrase '${phrase}' found. "
    fi
done

# Check for red/urgent color values in UI code
if [ -d "apps/pwa/src" ]; then
    COLOR_HITS=$(grep -rn \
        -e '#[fF][fF]0000' \
        -e '#[eE][fF]4444' \
        -e '#[dD][cC]2626' \
        -e '#[bB]91[cC]1[cC]' \
        -e "color:\s*['\"]red['\"]" \
        -e 'color:\s*red' \
        -e 'bg-red-' \
        -e 'text-red-' \
        -e 'border-red-' \
        apps/pwa/src/ \
        --include='*.ts' --include='*.tsx' --include='*.css' \
        | grep -v '\.test\.' \
        | grep -v 'node_modules' \
        || true)
    if [ -n "$COLOR_HITS" ]; then
        BRAND_DETAIL="${BRAND_DETAIL}Red/urgent colors in UI code. "
    fi
fi

# Check for streak/gamification patterns
if [ -d "apps/pwa/src" ]; then
    GAMIFICATION_HITS=$(grep -rni \
        -e 'streak' \
        -e 'badge' \
        -e 'score' \
        -e 'points' \
        -e 'level up' \
        -e 'achievement' \
        -e 'leaderboard' \
        apps/pwa/src/ \
        --include='*.ts' --include='*.tsx' \
        | grep -v '\.test\.' \
        | grep -v 'node_modules' \
        || true)
    if [ -n "$GAMIFICATION_HITS" ]; then
        BRAND_DETAIL="${BRAND_DETAIL}Gamification/streak patterns in UI code. "
    fi
fi

if [ -n "$BRAND_DETAIL" ]; then
    add_check "brand-compliance" "false" "$BRAND_DETAIL"
    echo "Brand compliance violations:" >&2
    echo "  $BRAND_DETAIL" >&2
else
    add_check "brand-compliance" "true" ""
fi

# ---------- Dependency direction check ----------
# contracts <- domain <- api/pwa. No reverse imports allowed.

echo "" >&2
echo "=== Dependency direction ===" >&2

DEP_DETAIL=""

# Domain must not import from api or pwa
if [ -d "packages/domain/src" ]; then
    BAD_DOMAIN=$(grep -rn \
        -e "from ['\"]@olivia/pwa" \
        -e "from ['\"]@olivia/api" \
        -e "from ['\"]\.\./\.\./apps/" \
        packages/domain/src/ \
        || true)
    if [ -n "$BAD_DOMAIN" ]; then
        DEP_DETAIL="${DEP_DETAIL}Domain imports from api or pwa. "
    fi
fi

# Contracts must not import from anything internal
if [ -d "packages/contracts/src" ]; then
    BAD_CONTRACTS=$(grep -rn \
        -e "from ['\"]@olivia/domain" \
        -e "from ['\"]@olivia/pwa" \
        -e "from ['\"]@olivia/api" \
        -e "from ['\"]\.\./\.\./apps/" \
        -e "from ['\"]\.\./\.\./packages/" \
        packages/contracts/src/ \
        || true)
    if [ -n "$BAD_CONTRACTS" ]; then
        DEP_DETAIL="${DEP_DETAIL}Contracts imports from internal packages. "
    fi
fi

if [ -n "$DEP_DETAIL" ]; then
    add_check "dependency-direction" "false" "$DEP_DETAIL"
    echo "Dependency direction violations:" >&2
    echo "  $DEP_DETAIL" >&2
else
    add_check "dependency-direction" "true" ""
fi

# ---------- Emit structured JSON on stdout ----------

if [ "$ALL_PASSED" = "true" ]; then
    PY_ALL_PASSED="True"
    REASON="All checks passed."
else
    PY_ALL_PASSED="False"
    REASON="One or more checks failed."
fi

"$PYTHON" -c "
import json, sys
result = {
    'passed': $PY_ALL_PASSED,
    'reason': sys.argv[1],
    'checks': json.loads(sys.argv[2])
}
json.dump(result, sys.stdout)
" "$REASON" "$CHECKS"

if [ "$ALL_PASSED" = "true" ]; then
    exit 0
else
    exit 1
fi
