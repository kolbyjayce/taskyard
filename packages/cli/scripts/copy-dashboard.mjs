#!/usr/bin/env node

import { access, rm, mkdir, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyDashboard() {
  try {
    // Resolve paths relative to the CLI package root
    const cliRoot = resolve(__dirname, '..');
    const source = resolve(cliRoot, '../dashboard/dist');
    const target = resolve(cliRoot, 'dashboard');

    console.log('Copying dashboard assets...');
    console.log(`Source: ${source}`);
    console.log(`Target: ${target}`);

    // Check if source exists - fail if not accessible
    try {
      await access(source);
    } catch (error) {
      console.error('Error accessing dashboard source directory:', {
        path: source,
        error: error.message,
        code: error.code
      });
      process.exit(1);
    }

    // Remove existing target directory if it exists
    try {
      await rm(target, { recursive: true, force: true });
    } catch (error) {
      // Only ignore if target doesn't exist, otherwise fail
      if (error.code !== 'ENOENT') {
        console.error('Error removing target directory:', {
          path: target,
          error: error.message,
          code: error.code
        });
        process.exit(1);
      }
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