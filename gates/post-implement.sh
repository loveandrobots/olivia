#!/usr/bin/env bash
set -euo pipefail

# post-implement.sh — Olivia
# Runs after the implement stage. Must pass for review to begin.
# Checks: typecheck, lint, tests, brand compliance, dependency direction.
# Called by Forge after the implement stage completes.

FAILURES=()

# ---------- Tooling checks ----------

echo "=== TypeScript check ==="
if ! npm run typecheck; then
  FAILURES+=("typecheck failed")
fi

echo ""
echo "=== ESLint ==="
if ! npm run lint; then
  FAILURES+=("lint failed")
fi

echo ""
echo "=== Tests ==="
if ! npm test; then
  FAILURES+=("tests failed")
fi

# ---------- Brand compliance checks ----------
# These enforce Olivia's brand rules mechanically.
# See docs/brand/ for the full guidelines.

echo ""
echo "=== Brand compliance ==="

BRAND_FAILURES=()

# Check for exclamation marks in UI-facing code
# Exclude test files, node_modules, and non-UI code
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
  if [[ -n "$EXCL_HITS" ]]; then
    BRAND_FAILURES+=("Exclamation marks found in UI strings:")
    BRAND_FAILURES+=("$EXCL_HITS")
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
  if [[ -n "$HITS" ]]; then
    BRAND_FAILURES+=("Forbidden phrase '${phrase}' found:")
    BRAND_FAILURES+=("$HITS")
  fi
done

# Check for red/urgent color values in UI code
# Catches hex reds, 'red', and common urgent color patterns
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
  if [[ -n "$COLOR_HITS" ]]; then
    BRAND_FAILURES+=("Red/urgent colors found in UI code:")
    BRAND_FAILURES+=("$COLOR_HITS")
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
  if [[ -n "$GAMIFICATION_HITS" ]]; then
    BRAND_FAILURES+=("Gamification/streak patterns found in UI code:")
    BRAND_FAILURES+=("$GAMIFICATION_HITS")
  fi
fi

if [[ ${#BRAND_FAILURES[@]} -gt 0 ]]; then
  echo "Brand compliance violations:"
  for f in "${BRAND_FAILURES[@]}"; do
    echo "  $f"
  done
  FAILURES+=("brand compliance failed")
fi

# ---------- Dependency direction check ----------
# contracts <- domain <- api/pwa. No reverse imports allowed.

echo ""
echo "=== Dependency direction ==="

DEP_FAILURES=()

# Domain must not import from api or pwa
if [ -d "packages/domain/src" ]; then
  BAD_DOMAIN=$(grep -rn \
    -e "from ['\"]@olivia/pwa" \
    -e "from ['\"]@olivia/api" \
    -e "from ['\"]\.\./\.\./apps/" \
    packages/domain/src/ \
    || true)
  if [[ -n "$BAD_DOMAIN" ]]; then
    DEP_FAILURES+=("Domain imports from api or pwa:")
    DEP_FAILURES+=("$BAD_DOMAIN")
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
  if [[ -n "$BAD_CONTRACTS" ]]; then
    DEP_FAILURES+=("Contracts imports from internal packages:")
    DEP_FAILURES+=("$BAD_CONTRACTS")
  fi
fi

if [[ ${#DEP_FAILURES[@]} -gt 0 ]]; then
  echo "Dependency direction violations:"
  for f in "${DEP_FAILURES[@]}"; do
    echo "  $f"
  done
  FAILURES+=("dependency direction check failed")
fi

# ---------- Summary ----------

echo ""
echo "=== Gate Summary ==="

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "FAIL: post-implement gate failed with ${#FAILURES[@]} issue(s):"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi

echo "PASS: All post-implement checks passed."
exit 0

