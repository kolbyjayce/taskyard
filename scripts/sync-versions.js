#!/usr/bin/env node

/**
 * Sync versions across all packages to ensure consistency
 * Usage: node scripts/sync-versions.js [version]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(process.cwd());

function readPackageJson(packagePath) {
  const fullPath = resolve(ROOT_DIR, packagePath, 'package.json');
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function writePackageJson(packagePath, packageData) {
  const fullPath = resolve(ROOT_DIR, packagePath, 'package.json');
  writeFileSync(fullPath, JSON.stringify(packageData, null, 2) + '\n');
}

function syncVersions(targetVersion) {
  const packages = [
    { path: '.', name: 'root' },
    { path: 'packages/cli', name: 'taskyard' },
    { path: 'packages/mcp-server', name: '@taskyard/mcp-server' },
    { path: 'packages/dashboard', name: '@taskyard/dashboard' }
  ];

  // If no target version provided, use the root package version
  if (!targetVersion) {
    const rootPkg = readPackageJson('.');
    targetVersion = rootPkg.version;
  }

  console.log(`🔄 Syncing all packages to version: ${targetVersion}`);

  // Update all package versions
  for (const pkg of packages) {
    const packageData = readPackageJson(pkg.path);

    if (packageData.version !== targetVersion) {
      console.log(`  📦 ${pkg.name}: ${packageData.version} → ${targetVersion}`);
      packageData.version = targetVersion;
      writePackageJson(pkg.path, packageData);
    } else {
      console.log(`  ✅ ${pkg.name}: ${packageData.version} (already synced)`);
    }
  }

  // Update CLI dependency to MCP server
  const cliPkg = readPackageJson('packages/cli');
  const currentMcpDep = cliPkg.dependencies['@taskyard/mcp-server'];

  if (currentMcpDep !== targetVersion) {
    console.log(`  🔗 CLI dependency: ${currentMcpDep} → ${targetVersion}`);
    cliPkg.dependencies['@taskyard/mcp-server'] = targetVersion;
    writePackageJson('packages/cli', cliPkg);
  } else {
    console.log(`  ✅ CLI dependency: ${currentMcpDep} (already synced)`);
  }

  console.log(`\n✅ All packages synced to version ${targetVersion}`);
}

// Get version from command line argument
const targetVersion = process.argv[2];
syncVersions(targetVersion);