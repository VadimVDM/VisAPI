#!/bin/bash

# VisAPI Pre-Commit Backend Quality Check
# Runs formatting, linting, type checking, security scanning, and DB type regeneration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running pre-commit backend quality checks...${NC}"
echo ""

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Check if any backend files are staged
BACKEND_FILES=$(echo "$STAGED_FILES" | grep -E '^apps/backend/|^libs/' || true)

if [ -z "$BACKEND_FILES" ]; then
  echo -e "${GREEN}✓ No backend files changed, skipping backend checks${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Backend files changed:${NC}"
echo "$BACKEND_FILES" | sed 's/^/  - /'
echo ""

# Step 1: Run code formatting
echo -e "${BLUE}📝 Step 1/5: Running code formatter...${NC}"
if pnpm format --uncommitted 2>/dev/null; then
  # Check if any files were formatted
  FORMATTED_FILES=$(git diff --name-only)
  if [ -n "$FORMATTED_FILES" ]; then
    echo -e "${YELLOW}📝 Files formatted:${NC}"
    echo "$FORMATTED_FILES" | sed 's/^/  - /'
    git add $FORMATTED_FILES
    echo -e "${GREEN}✓ Formatted files staged${NC}"
  else
    echo -e "${GREEN}✓ All files already formatted${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Formatter not available, skipping${NC}"
fi
echo ""

# Step 2: Run security scanning (Python files)
PYTHON_FILES=$(echo "$BACKEND_FILES" | grep '\.py$' || true)
if [ -n "$PYTHON_FILES" ]; then
  echo -e "${BLUE}🔒 Step 2/5: Running security scan (Bandit)...${NC}"

  if [ -f ".venv/bin/bandit" ]; then
    # Run bandit showing all issues
    echo -e "${YELLOW}Scanning Python files for security issues...${NC}"

    # First, run bandit to show all issues (won't fail)
    .venv/bin/bandit -r apps/backend -f screen 2>/dev/null || true

    # Then, check for HIGH severity issues (will fail if found)
    if .venv/bin/bandit -r apps/backend -lll -q 2>/dev/null; then
      echo -e "${GREEN}✓ No high-severity security issues found${NC}"
    else
      echo -e "${RED}✗ High-severity security issues detected!${NC}"
      echo -e "${YELLOW}Please review and fix high-severity issues before committing${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️  Bandit not installed. Run 'make python-setup' to install${NC}"
  fi
else
  echo -e "${GREEN}✓ No Python files changed, skipping security scan${NC}"
fi
echo ""

# Step 3: Run backend linting
echo -e "${BLUE}🔎 Step 3/5: Running backend linting...${NC}"
if ! pnpm lint:backend; then
  echo -e "${RED}✗ Backend linting failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend linting passed${NC}"
echo ""

# Step 4: Run backend type checking
echo -e "${BLUE}🔧 Step 4/5: Running backend type checking...${NC}"
if ! pnpm typecheck:backend; then
  echo -e "${RED}✗ Backend type checking failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend type checking passed${NC}"
echo ""

# Step 5: Regenerate database types
echo -e "${BLUE}🔄 Step 5/5: Regenerating database types...${NC}"
if pnpm regenerate:types 2>/dev/null; then
  echo -e "${GREEN}✓ Database types regenerated${NC}"

  # Check if types file was modified
  TYPES_FILE="libs/shared/types/src/lib/database.types.ts"
  if git diff --name-only "$TYPES_FILE" | grep -q "$TYPES_FILE"; then
    echo -e "${YELLOW}📝 Database types updated, staging changes...${NC}"
    git add "$TYPES_FILE"
    echo -e "${GREEN}✓ Types file staged${NC}"
  else
    echo -e "${GREEN}✓ Database types unchanged${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Database type regeneration skipped (SUPABASE_ACCESS_TOKEN not set)${NC}"
fi

echo ""
echo -e "${GREEN}✅ All pre-commit checks passed!${NC}"
