#!/usr/bin/env node

import { access, rm, mkdir, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyDashboard() {
  try {
    // Resolve paths relative to the mcp-server package root
    const packageRoot = resolve(__dirname, '..');
    const source = resolve(packageRoot, '../dashboard/dist');
    const target = resolve(packageRoot, 'dist/dashboard');

    console.log('Copying dashboard assets...');
    console.log(`Source: ${source}`);
    console.log(`Target: ${target}`);

    // Check if source exists - exit gracefully if not
    try {
      await access(source);
    } catch (error) {
      console.log('Dashboard files not found, skipping copy');
      process.exit(0);
    }

    // Remove existing target directory if it exists
    try {
      await rm(target, { recursive: true, force: true });
    } catch (error) {
      // Ignore if target doesn't exist
    }

    // Create target directory structure
    await mkdir(target, { recursive: true });

    // Copy all files from source to target
    await cp(source, target, {
      recursive: true,
      preserveTimestamps: true
    });

    console.log('Dashboard assets copied successfully!');
  } catch (error) {
    console.error('Error copying dashboard assets:', error.message);
    process.exit(1);
  }
}

copyDashboard();