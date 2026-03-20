#!/usr/bin/env node

/**
 * Check if packages are ready for publishing
 * Validates versions, dependencies, and build artifacts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(process.cwd());

function readPackageJson(packagePath) {
  const fullPath = resolve(ROOT_DIR, packagePath, 'package.json');
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function checkPublishReady() {
  console.log('🔍 Checking if packages are ready for publishing...\n');

  let hasErrors = false;

  // Check if all packages have the same version
  const rootPkg = readPackageJson('.');
  const cliPkg = readPackageJson('packages/cli');
  const dashboardPkg = readPackageJson('packages/dashboard');

  const targetVersion = rootPkg.version;

  console.log(`Target version: ${targetVersion}\n`);

  // Version checks
  const packages = [
    { name: 'CLI', pkg: cliPkg, path: 'packages/cli' },
    { name: 'Dashboard', pkg: dashboardPkg, path: 'packages/dashboard' }
  ];

  console.log('📦 Package Versions:');
  for (const { name, pkg } of packages) {
    const match = pkg.version === targetVersion;
    console.log(`  ${match ? '✅' : '❌'} ${name}: ${pkg.version}`);
    if (!match) hasErrors = true;
  }

  console.log('\n✅ No external dependencies to check (MCP server integrated into CLI)');

  // Build artifact checks
  console.log('\n🏗️  Build Artifacts:');
  const distChecks = [
    { name: 'CLI dist/', path: 'packages/cli/dist' },
    { name: 'CLI dashboard/', path: 'packages/cli/dashboard' },
    { name: 'Dashboard dist/', path: 'packages/dashboard/dist' }
  ];

  for (const { name, path } of distChecks) {
    const exists = existsSync(resolve(ROOT_DIR, path));
    console.log(`  ${exists ? '✅' : '❌'} ${name}`);
    if (!exists) hasErrors = true;
  }

  // publishConfig checks
  console.log('\n🚀 Publish Config:');
  const publishChecks = [
    { name: 'CLI publishConfig', pkg: cliPkg }
  ];

  for (const { name, pkg } of publishChecks) {
    const hasConfig = pkg.publishConfig?.access === 'public';
    console.log(`  ${hasConfig ? '✅' : '❌'} ${name}`);
    if (!hasConfig) hasErrors = true;
  }

  // Files config checks
  console.log('\n📁 Files Config:');
  const hasFiles = Array.isArray(cliPkg.files) && cliPkg.files.length > 0;
  console.log(`  ${hasFiles ? '✅' : '❌'} CLI files array`);
  if (!hasFiles) hasErrors = true;

  console.log('\n' + '='.repeat(50));

  if (hasErrors) {
    console.log('❌ PUBLISH NOT READY - Fix the issues above');
    console.log('\n💡 Quick fixes:');
    console.log('   - Run: node scripts/sync-versions.js');
    console.log('   - Run: npm run build');
    process.exit(1);
  } else {
    console.log('✅ READY FOR PUBLISHING');
    console.log('\n🚀 Next steps:');
    console.log(`   - Manual: ./scripts/publish.sh ${targetVersion}`);
    console.log(`   - GitHub: git tag v${targetVersion} && git push origin v${targetVersion}`);
  }
}

checkPublishReady();