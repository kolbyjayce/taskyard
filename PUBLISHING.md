# Publishing Guide

This document outlines the publishing process for taskyard packages to npm using **NPM Trusted Publishing**.

## ✅ Prerequisites

### NPM Trusted Publishing Setup
Configure trusted publishing for both packages on npmjs.com:
1. Go to npmjs.com → Account Settings → Publishing Access
2. Add this GitHub repository as a trusted publisher for:
   - `taskyard` package
   - `@taskyard/mcp-server` package

### GitHub Environment
Create a protected environment (optional but recommended):
1. Go to Repository Settings → Environments
2. Create `npm-publishing` environment
3. Add protection rules as needed

## 🚀 Automated Publishing (Recommended)

All publishing is handled by the consolidated **NPM Trusted Publishing** workflow.

### 1. Stable Releases

**Method 1: Git Tag (Automatic)**
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

**Method 2: Manual Trigger**
1. Go to Actions → "NPM Trusted Publishing"
2. Click "Run workflow"
3. Select release type: `patch`, `minor`, or `major`

### 2. Beta/Prerelease

**Manual Trigger Only:**
1. Go to Actions → "NPM Trusted Publishing"
2. Click "Run workflow"
3. Select release type: `prerelease`
4. Enter prerelease tag (e.g., `beta`, `rc`, `alpha`)

## 🧪 Testing Releases

**Dry Run Mode:**
1. Go to Actions → "NPM Trusted Publishing"
2. Click "Run workflow"
3. Check "Dry Run" option
4. Select any release type to test the workflow

This validates the entire publishing process without actually publishing to npm.

## 📦 What the Workflow Does

The consolidated workflow automatically:
1. **Validates**: Runs linting, type checking, and tests
2. **Builds**: Compiles all packages
3. **Versions**: Updates package versions consistently
4. **Publishes**:
   - MCP server first (with provenance)
   - CLI second (after verifying dependency availability)
5. **Verifies**: Confirms packages are available on npm registry
6. **Tags**: Creates GitHub release (for stable releases)

## 🔧 Manual Publishing (Not Recommended)

⚠️ **Warning**: Manual publishing bypasses trusted publishing security. Only use if automated workflow fails.

### Requirements
- npm login with publish permissions
- Clean working directory

### Steps
1. **Prepare environment**:
   ```bash
   npm login  # Login to npm
   git status  # Ensure clean working directory
   ```

2. **Run tests and build**:
   ```bash
   npm test
   npm run build
   ```

3. **Update versions** (use sync script):
   ```bash
   node scripts/sync-versions.js 1.0.0
   ```

4. **Publish packages** (order matters):
   ```bash
   # Publish MCP server first
   cd packages/mcp-server
   npm publish --provenance

   # Wait for registry propagation, then publish CLI
   cd ../../packages/cli
   npm publish --provenance
   ```

5. **Create git tag**:
   ```bash
   git add .
   git commit -m "chore: release v1.0.0"
   git tag v1.0.0
   git push origin main v1.0.0
   ```

## Package Configuration

### Published Packages

1. **`taskyard`** - CLI package
   - Entry point: `./dist/index.js`
   - Executable: `taskyard`

2. **`@taskyard/mcp-server`** - MCP server package
   - Entry point: `./dist/index.js`
   - TypeScript definitions: `./dist/index.d.ts`

### Dependencies

The CLI package depends on the MCP server with exact version matching:
```json
{
  "dependencies": {
    "@taskyard/mcp-server": "1.0.0-beta.1"
  }
}
```

**Important**:
- Always publish the MCP server before the CLI
- All packages must have synchronized versions
- Use `node scripts/sync-versions.js [version]` to ensure version consistency

## 🔐 Security & Authentication

**No GitHub Secrets Required!**

This setup uses **NPM Trusted Publishing** with OpenID Connect (OIDC):
- ✅ No long-lived tokens stored in GitHub
- ✅ Automatic provenance attestation
- ✅ Enhanced security through cryptographic verification
- ✅ No secret rotation required

## 📁 Workflow Files

- `.github/workflows/ci.yml` - Continuous integration (tests, linting)
- `.github/workflows/npm-publish.yml` - **Consolidated trusted publishing workflow**

## Troubleshooting

### Common Issues

1. **NPM Trusted Publishing Not Configured**
   - Error: `npm ERR! 403 Forbidden`
   - Solution: Configure trusted publishing on npmjs.com for both packages

2. **Version conflicts**: Ensure all packages have consistent versions
   - Solution: Run `node scripts/sync-versions.js [target-version]`

3. **Dependency issues**: CLI must use exact MCP server version for releases
   - Error: `'@taskyard/mcp-server@x.x.x' is not in this registry`
   - Solution: Workflow automatically handles this with retry logic

4. **Workflow permission errors**:
   - Error: `Error: Process completed with exit code 1`
   - Solution: Ensure repository has `Actions` and `Pages` permissions enabled

### Rollback Process

If a release has issues:

1. **Deprecate the problematic version**:
   ```bash
   npm deprecate taskyard@1.0.0 "Use version 1.0.1 instead"
   npm deprecate @taskyard/mcp-server@1.0.0 "Use version 1.0.1 instead"
   ```

2. **Publish a patch release** with fixes

3. **Update documentation** if needed

## ✅ Post-Release Checklist

- [ ] Verify packages are live on npm
- [ ] Test installation: `npx taskyard@latest`
- [ ] Verify provenance attestation is present
- [ ] Update documentation if needed
- [ ] Announce release in relevant channels
- [ ] Monitor for issues in the first 24 hours

## 🧪 Beta Testing

Prerelease versions are published with custom tags:

```bash
# Install beta versions (example tags)
npx taskyard@beta
npx taskyard@rc
npm install @taskyard/mcp-server@beta
```

Users can opt into testing by using the appropriate tag (e.g., `@beta`, `@rc`, `@alpha`).