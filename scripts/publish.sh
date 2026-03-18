#!/bin/bash

# Taskyard Publishing Script
# Usage: ./scripts/publish.sh [version] [--dry-run] [--beta]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
echo "=================================="

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

echo -e "${YELLOW}📋 Publishing version: $VERSION${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

# Build packages
echo -e "${YELLOW}🔨 Building packages...${NC}"
npm run build

# Update versions
echo -e "${YELLOW}📝 Updating package versions...${NC}"
if [[ "$DRY_RUN" == "false" ]]; then
  npm version "$VERSION" --no-git-tag-version --workspaces
  npm version "$VERSION" --no-git-tag-version
fi

echo -e "${GREEN}📦 Package versions updated:${NC}"
echo "- CLI: $(node -p "require('./packages/cli/package.json').version")"
echo "- MCP Server: $(node -p "require('./packages/mcp-server/package.json').version")"

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}🔍 DRY RUN - Would publish:${NC}"
  echo "  - taskyard@$VERSION"
  echo "  - @taskyard/mcp-server@$VERSION"

  if [[ "$BETA" == "true" ]]; then
    echo "  - Published to 'beta' tag"
  else
    echo "  - Published to 'latest' tag"
  fi

  echo -e "${GREEN}✅ Dry run completed successfully${NC}"
  exit 0
fi

# Publish packages
echo -e "${YELLOW}🚀 Publishing packages...${NC}"

# Publish MCP Server first (CLI depends on it)
cd packages/mcp-server
if [[ "$BETA" == "true" ]]; then
  npm publish --tag beta
  echo -e "${GREEN}✅ Published @taskyard/mcp-server@$VERSION (beta)${NC}"
else
  npm publish
  echo -e "${GREEN}✅ Published @taskyard/mcp-server@$VERSION${NC}"
fi
cd ../..

# Update CLI dependency
if [[ "$BETA" == "false" ]]; then
  echo -e "${YELLOW}🔄 Updating CLI dependency version...${NC}"
  cd packages/cli
  npm install @taskyard/mcp-server@$VERSION --save
  cd ../..
fi

# Publish CLI
cd packages/cli
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

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
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
  echo "  npm install @taskyard/mcp-server@$VERSION"
else
  echo "  npx taskyard@latest"
  echo "  npm install @taskyard/mcp-server@latest"
fi
echo ""
echo -e "${YELLOW}🔗 NPM Links:${NC}"
echo "  - https://www.npmjs.com/package/taskyard"
echo "  - https://www.npmjs.com/package/@taskyard/mcp-server"