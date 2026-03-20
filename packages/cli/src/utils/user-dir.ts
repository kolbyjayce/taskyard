import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import lockfile from "proper-lockfile";

export const USER_DIR = path.join(os.homedir(), ".taskyard");
export const USER_DASHBOARD_DIR = path.join(USER_DIR, "dashboard");
export const USER_CONFIG_DIR = path.join(USER_DIR, "config");
export const USER_LOGS_DIR = path.join(USER_DIR, "logs");

/**
 * Ensures the ~/.taskyard directory structure exists
 */
export async function ensureUserDir(): Promise<void> {
  await fs.mkdir(USER_DIR, { recursive: true });
  await fs.mkdir(USER_DASHBOARD_DIR, { recursive: true });
  await fs.mkdir(USER_CONFIG_DIR, { recursive: true });
  await fs.mkdir(USER_LOGS_DIR, { recursive: true });
}

/**
 * Copies dashboard assets to ~/.taskyard/dashboard
 * Uses atomic installation with temporary directory and cross-process locking
 */
export async function installDashboardAssets(): Promise<void> {
  const lockPath = path.join(USER_DIR, ".dashboard-install.lock");

  // Acquire cross-process lock to serialize installations
  const release = await lockfile.lock(USER_DIR, {
    lockfilePath: lockPath,
    retries: {
      retries: 5,
      maxTimeout: 5000
    }
  });

  try {
    // Check if dashboard is already installed and up-to-date
    if (await isDashboardInstalled()) {
      return;
    }

    // Find dashboard source directory
    const sourceDist = await findDashboardSource();

    // Create temporary directory for atomic installation
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskyard-dashboard-"));

    try {
      // Copy all dashboard files to temporary directory first
      await copyDirectory(sourceDist, tempDir);

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(USER_DASHBOARD_DIR), { recursive: true });

      // Atomically move temp directory to final destination
      await atomicReplace(tempDir, USER_DASHBOARD_DIR);

    } catch (error) {
      // Clean up temporary directory on failure
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }

  } catch (error) {
    throw new Error(`Failed to install dashboard assets: ${error}`);
  } finally {
    // Always release the lock
    await release().catch(() => {});
  }
}

/**
 * Finds the dashboard source directory from various possible locations
 */
async function findDashboardSource(): Promise<string> {
  // First try to find dashboard assets bundled with the CLI package
  const cliUrl = import.meta.url;
  const cliPath = fileURLToPath(cliUrl);
  const packageRoot = path.resolve(path.dirname(cliPath), "../..");

  const possibleDistPaths = [
    path.join(packageRoot, "dashboard"), // bundled with CLI package
    path.join(packageRoot, "..", "dashboard", "dist"), // monorepo dev
  ];

  for (const distPath of possibleDistPaths) {
    try {
      await fs.access(distPath);
      const indexPath = path.join(distPath, "index.html");
      await fs.access(indexPath); // ensure it has built files
      return distPath;
    } catch {
      continue;
    }
  }

  // Try to resolve the dashboard package separately
  try {
    const dashboardPackageUrl = await import.meta.resolve("@taskyard/dashboard");
    const dashboardPackagePath = fileURLToPath(dashboardPackageUrl);
    const dashboardRoot = path.dirname(dashboardPackagePath);
    const dashboardDist = path.join(dashboardRoot, "dist");
    await fs.access(dashboardDist);
    return dashboardDist;
  } catch {
    throw new Error("Dashboard build files not found in any expected location");
  }
}

/**
 * Atomically replaces destination with source directory
 */
async function atomicReplace(sourceDir: string, destDir: string): Promise<void> {
  const backupDir = `${destDir}.backup.${Date.now()}`;
  let needsRestore = false;

  try {
    // If destination exists, move it to backup location
    try {
      await fs.access(destDir);
      await fs.rename(destDir, backupDir);
      needsRestore = true;
    } catch {
      // Destination doesn't exist, no backup needed
    }

    // Move source to final destination
    await fs.rename(sourceDir, destDir);

    // Clean up backup on success
    if (needsRestore) {
      await fs.rm(backupDir, { recursive: true, force: true }).catch(() => {});
    }

  } catch (error) {
    // Restore backup if the move failed
    if (needsRestore) {
      try {
        await fs.rename(backupDir, destDir);
      } catch {
        // Failed to restore backup, but original error is more important
      }
    }
    throw error;
  }
}

/**
 * Recursively copy directory contents
 */
async function copyDirectory(source: string, destination: string): Promise<void> {
  const entries = await fs.readdir(source, { withFileTypes: true });

  await fs.mkdir(destination, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Check if dashboard assets are installed and up to date
 */
export async function isDashboardInstalled(): Promise<boolean> {
  try {
    const indexPath = path.join(USER_DASHBOARD_DIR, "index.html");
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path where dashboard assets are stored
 */
export function getDashboardPath(): string {
  return USER_DASHBOARD_DIR;
}