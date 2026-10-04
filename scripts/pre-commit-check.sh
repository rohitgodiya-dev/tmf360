#!/bin/bash
# Trial360 OS — Pre-Commit Check. Run from the repo root: bash scripts/pre-commit-check.sh
echo "=== Trial360 OS Pre-Commit Check ==="
PASS=true

echo "1. Build check..."
# Cron routes create the service client at import, so the local build needs a placeholder key.
BUILD=$(SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder}" npm run build 2>&1)
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "❌ FAIL: Build errors"
  echo "$BUILD" | tail -20
  PASS=false
else
  echo "✅ PASS: Build clean"
fi

echo "2. No browser dialogs..."
if grep -rn "window\.confirm\|window\.alert" app/ --include="*.tsx"; then
  echo "❌ FAIL: Found window.confirm/alert — use styled modals"
  PASS=false
else
  echo "✅ PASS"
fi

echo "3. Site360 agent isolation..."
if grep -rn "\.from([\"']demo_requests[\"'])" app/site360/ --include="*.tsx" 2>/dev/null; then
  echo "❌ FAIL: Site360 reading from demo_requests"
  PASS=false
else
  echo "✅ PASS"
fi

echo "4. ISF agent isolation..."
if grep -rni "\.from([\"']documents[\"'])" app/site360/isf/ --include="*.tsx" 2>/dev/null; then
  echo "❌ FAIL: ISF reading from documents"
  PASS=false
else
  echo "✅ PASS"
fi

echo "5. No className in page files..."
# Tabler icon-font classes (className="ti ti-...") are allowed; anything else is Tailwind.
if grep -n "className=" app/platform/page.tsx app/site360/page.tsx 2>/dev/null | grep -v "className=[\"{\`]*ti "; then
  echo "❌ FAIL: Tailwind className in inline-style page"
  PASS=false
else
  echo "✅ PASS"
fi

echo "6. Document Intake not bypassed..."
if grep -n "from([\"']documents[\"'])\.insert" app/platform/page.tsx 2>/dev/null; then
  echo "⚠ WARNING: Direct documents insert — new documents should go through Document Intake first"
fi

if [ "$PASS" = true ]; then
  echo "=== ALL CHECKS PASSED ==="
  exit 0
else
  echo "=== CHECKS FAILED — fix before pushing ==="
  exit 1
fi
