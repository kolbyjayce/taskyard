# Publishing Guide

This document outlines the publishing process for taskyard packages to npm.

## Automated Publishing (Recommended)

### 1. Stable Releases

Stable releases are published automatically when you push a git tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This triggers the **Release** workflow which:
- Runs all tests
- Builds packages
- Updates package versions
- Publishes to npm with `latest` tag
- Creates a GitHub release

### 2. Beta Releases

Beta releases can be triggered in two ways:

#### Automatic (on develop branch)
Push to the `develop` branch automatically publishes a timestamped beta:
```bash
git push origin develop
```

#### Manual Trigger
Use the GitHub Actions "Publish Beta" workflow:
1. Go to Actions → Publish Beta
2. Click "Run workflow"
3. Enter a beta tag (e.g., `beta.1`, `rc.1`)

### 3. Version Bumping

Use the "Version Bump" workflow to prepare releases:
1. Go to Actions → Version Bump
2. Choose version type: `patch`, `minor`, or `major`
3. Optionally create a pre-release
4. This creates a commit and tag automatically

## Manual Publishing

### Local Publishing Script

Use the provided script for manual control:

```bash
# Stable release
./scripts/publish.sh 1.0.0

# Beta release
./scripts/publish.sh 1.0.0-beta.1 --beta

# Dry run (test without publishing)
./scripts/publish.sh 1.0.0 --dry-run
```

### Manual Steps

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

3. **Update versions**:
   ```bash
   npm version patch --workspaces --no-git-tag-version
   npm version patch --no-git-tag-version
   ```

4. **Publish packages** (order matters):
   ```bash
   # Publish MCP server first
   cd packages/mcp-server
   npm publish

   # Update CLI dependency and publish
   cd ../cli
   npm install @taskyard/mcp-server@latest
   npm publish
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

## GitHub Secrets Required

Add these secrets to your GitHub repository:

- `NPM_TOKEN` - npm authentication token with publish permissions

## Workflow Files

- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/release.yml` - Stable releases (triggered by tags)
- `.github/workflows/publish-beta.yml` - Beta releases
- `.github/workflows/version-bump.yml` - Version management

## Troubleshooting

### Common Issues

1. **Version conflicts**: Ensure all packages have consistent versions
   - Solution: Run `node scripts/sync-versions.js [target-version]`
2. **Dependency issues**: CLI must use exact MCP server version for releases
   - Error: `'@taskyard/mcp-server@x.x.x' is not in this registry`
   - Solution: Ensure MCP server is published first, or sync versions
3. **Permission errors**: Verify npm authentication and package access

### Rollback Process

If a release has issues:

1. **Deprecate the problematic version**:
   ```bash
   npm deprecate taskyard@1.0.0 "Use version 1.0.1 instead"
   npm deprecate @taskyard/mcp-server@1.0.0 "Use version 1.0.1 instead"
   ```

2. **Publish a patch release** with fixes

3. **Update documentation** if needed

## Post-Release Checklist

- [ ] Verify packages are live on npm
- [ ] Test installation: `npx taskyard@latest`
- [ ] Update documentation if needed
- [ ] Announce release in relevant channels
- [ ] Monitor for issues in the first 24 hours

## Beta Testing

Beta releases are published with the `beta` tag:

```bash
# Install beta versions
npx taskyard@beta
npm install @taskyard/mcp-server@beta
```

Users can opt into beta testing by using the `@beta` tag.