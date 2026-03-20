#!/bin/bash

# Taskyard Publishing Script
# Usage: ./scripts/publish.sh [version] [--dry-run] [--beta]
#
# This script handles two-phase publishing:
# 1. Publish MCP server first
# 2. Update CLI to use the published MCP server, then publish CLI

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

echo -e "${GREEN}🚀 Taskyard Two-Phase Publishing Script${NC}"
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
  echo -e "${YELLOW}🔍 DRY RUN - Would execute two-phase publish:${NC}"
  echo "  Phase 1: @taskyard/mcp-server@$VERSION"
  echo "  Phase 2: taskyard@$VERSION (depending on published MCP server)"

  if [[ "$BETA" == "true" ]]; then
    echo "  - Both published to 'beta' tag"
  else
    echo "  - Both published to 'latest' tag"
  fi

  echo -e "${GREEN}✅ Dry run completed successfully${NC}"
  exit 0
fi

# PHASE 1: Publish MCP Server
echo ""
echo -e "${BLUE}📦 PHASE 1: Publishing MCP Server${NC}"
echo "======================================="
cd packages/mcp-server

if [[ "$BETA" == "true" ]]; then
  npm publish --tag beta
  echo -e "${GREEN}✅ Published @taskyard/mcp-server@$VERSION (beta)${NC}"
else
  npm publish
  echo -e "${GREEN}✅ Published @taskyard/mcp-server@$VERSION${NC}"
fi
cd ../..

# Wait for npm registry propagation
echo -e "${YELLOW}⏳ Waiting 10 seconds for npm registry propagation...${NC}"
sleep 10

# PHASE 2: Update CLI dependency and publish CLI
echo ""
echo -e "${BLUE}📦 PHASE 2: Publishing CLI${NC}"
echo "=========================="

cd packages/cli

# Install the exact version we just published
echo -e "${YELLOW}🔄 Installing published MCP server dependency...${NC}"
npm install @taskyard/mcp-server@$VERSION --save --save-exact

# Verify the dependency was installed correctly
INSTALLED_VERSION=$(node -p "require('./package.json').dependencies['@taskyard/mcp-server']")
if [[ "$INSTALLED_VERSION" != "$VERSION" ]]; then
  echo -e "${RED}❌ Error: Failed to install correct MCP server version${NC}"
  echo "Expected: $VERSION, Got: $INSTALLED_VERSION"
  exit 1
fi

echo -e "${GREEN}✅ CLI now depends on @taskyard/mcp-server@$INSTALLED_VERSION${NC}"

# Rebuild CLI with correct dependency
echo -e "${YELLOW}🔨 Rebuilding CLI with published dependency...${NC}"
npm run build

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
echo -e "${GREEN}🎉 Two-phase publishing completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Installation commands:${NC}"
if [[ "$BETA" == "true" ]]; then
  echo "  npx taskyard@$VERSION"
  echo "  npm install @taskyard/mcp-server@$VERSION"
else
  echo "  npx taskyard@latest"
  echo "  npm install @taskyard/mcp-server@latest"
fi
echo ""
echo -e "${YELLOW}🔗 NPM Links:${NC}"
echo "  - https://www.npmjs.com/package/taskyard"
echo "  - https://www.npmjs.com/package/@taskyard/mcp-server"
echo ""
echo -e "${BLUE}📊 Published packages:${NC}"
echo "  1. @taskyard/mcp-server@$VERSION"
echo "  2. taskyard@$VERSION (depends on published MCP server)"
