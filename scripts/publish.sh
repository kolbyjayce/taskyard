#!/bin/bash

# Taskyard Publishing Script
# Usage: ./scripts/publish.sh [version] [--dry-run] [--beta]
#
# This script publishes the consolidated taskyard CLI package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=false
BETA=false
VERSION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --beta)
      BETA=true
      shift
      ;;
    *)
      if [[ -z "$VERSION" ]]; then
        VERSION="$1"
      fi
      shift
      ;;
  esac
done

echo -e "${GREEN}🚀 Taskyard Publishing Script${NC}"
echo "================================================"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "packages" ]]; then
  echo -e "${RED}❌ Error: Please run this script from the taskyard root directory${NC}"
  exit 1
fi

# Check if git is clean
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}❌ Error: Git working directory is not clean. Please commit or stash changes.${NC}"
  git status --short
  exit 1
fi

# Check if we're on main branch (for stable releases)
if [[ "$BETA" == "false" ]]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${YELLOW}⚠️  Warning: You're not on the main branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi
  fi
fi

# Determine version
if [[ -z "$VERSION" ]]; then
  CURRENT_VERSION=$(node -p "require('./package.json').version")
  if [[ "$BETA" == "true" ]]; then
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    VERSION="${CURRENT_VERSION}-beta.${TIMESTAMP}"
  else
    echo "Current version: $CURRENT_VERSION"
    echo "Available bump types: patch, minor, major"
    read -p "Enter version or bump type: " VERSION
  fi
fi

echo -e "${YELLOW}📋 Target version: $VERSION${NC}"

# Validate and sync versions
echo -e "${BLUE}🔍 Validating current state...${NC}"
node scripts/check-publish-ready.js 2>/dev/null || {
  echo -e "${YELLOW}🔄 Syncing versions...${NC}"
  node scripts/sync-versions.js "$VERSION"
}

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

# Build packages
echo -e "${YELLOW}🔨 Building packages...${NC}"
npm run build

# Update versions if needed
echo -e "${YELLOW}📝 Setting package versions to $VERSION...${NC}"
if [[ "$DRY_RUN" == "false" ]]; then
  node scripts/sync-versions.js "$VERSION"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}🔍 DRY RUN - Would publish:${NC}"
  echo "  taskyard@$VERSION"

  if [[ "$BETA" == "true" ]]; then
    echo "  - Published to 'beta' tag"
  else
    echo "  - Published to 'latest' tag"
  fi

  echo -e "${GREEN}✅ Dry run completed successfully${NC}"
  exit 0
fi

# Publish the consolidated CLI package
echo ""
echo -e "${BLUE}📦 Publishing taskyard CLI${NC}"
echo "=========================="

cd packages/cli

# Publish CLI
echo -e "${YELLOW}🚀 Publishing CLI...${NC}"
if [[ "$BETA" == "true" ]]; then
  npm publish --tag beta
  echo -e "${GREEN}✅ Published taskyard@$VERSION (beta)${NC}"
else
  npm publish
  echo -e "${GREEN}✅ Published taskyard@$VERSION${NC}"
fi

cd ../..

# Create git tag and commit (for stable releases)
if [[ "$BETA" == "false" ]]; then
  echo -e "${YELLOW}📝 Creating git tag and commit...${NC}"
  git add .
  git commit -m "chore: release v$VERSION

Co-Authored-By: Kolby <kolbyjayce1@gmail.com>"
  git tag "v$VERSION"

  echo -e "${GREEN}📡 Push to remote? (y/N):${NC}"
  read -p "" -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "v$VERSION"
    echo -e "${GREEN}✅ Pushed to remote repository${NC}"
  fi
fi

echo ""
echo -e "${GREEN}🎉 Publishing completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Installation commands:${NC}"
if [[ "$BETA" == "true" ]]; then
  echo "  npx taskyard@$VERSION"
else
  echo "  npx taskyard@latest"
fi
echo ""
echo -e "${YELLOW}🔗 NPM Links:${NC}"
echo "  - https://www.npmjs.com/package/taskyard"
echo ""
echo -e "${BLUE}📊 Published package:${NC}"
echo "  taskyard@$VERSION (consolidated CLI with integrated MCP server and dashboard)"
