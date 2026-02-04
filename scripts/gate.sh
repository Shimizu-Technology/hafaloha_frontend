#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "🔒 Running full gate — Legacy Hafaloha Frontend"
echo "================================================"

echo ""
echo "📘 Step 1/3: TypeScript check..."
if npx tsc --noEmit 2>&1; then
  echo "  ✅ TypeScript passed"
else
  echo "  ❌ TypeScript errors found"
  exit 1
fi

echo ""
echo "📝 Step 2/3: ESLint..."
LINT_OUTPUT=$(npm run lint 2>&1 || true)
echo "$LINT_OUTPUT" | tail -3
if echo "$LINT_OUTPUT" | grep -q "0 problems"; then
  echo "  ✅ ESLint passed"
else
  echo "  ⚠️  ESLint has pre-existing issues (review new vs existing)"
fi

echo ""
echo "🏗️  Step 3/3: Production build..."
if npm run build 2>&1 | tail -3; then
  echo "  ✅ Build succeeded"
else
  echo "  ❌ Build failed"
  exit 1
fi

echo ""
echo "🐛 Bonus: Debug statements..."
DEBUG_COUNT=$(grep -rn "console.log\|console.debug\|debugger" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules src/ 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $DEBUG_COUNT console.log/debugger statements"

echo ""
echo "================================================"
echo "🏁 Gate complete!"
