import fs from "fs/promises";
import path from "path";
import os from "os";

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
 */
export async function installDashboardAssets(): Promise<void> {
  try {
    // First try to find dashboard assets bundled with the CLI package
    const cliUrl = import.meta.url;
    const cliPath = new URL(cliUrl).pathname;
    const packageRoot = path.resolve(path.dirname(cliPath), "../..");

    const possibleDistPaths = [
      path.join(packageRoot, "dashboard"), // bundled with CLI package
      path.join(packageRoot, "..", "dashboard", "dist"), // monorepo dev
    ];

    let sourceDist: string | null = null;
    for (const distPath of possibleDistPaths) {
      try {
        await fs.access(distPath);
        const indexPath = path.join(distPath, "index.html");
        await fs.access(indexPath); // ensure it has built files
        sourceDist = distPath;
        break;
      } catch {
        continue;
      }
    }

    if (!sourceDist) {
      // Try to resolve the dashboard package separately
      try {
        const dashboardPackageUrl = await import.meta.resolve("@taskyard/dashboard");
        const dashboardPackagePath = new URL(dashboardPackageUrl).pathname;
        const dashboardRoot = path.dirname(dashboardPackagePath);
        const dashboardDist = path.join(dashboardRoot, "dist");
        await fs.access(dashboardDist);
        sourceDist = dashboardDist;
      } catch {
        throw new Error("Dashboard build files not found in any expected location");
      }
    }

    // Copy all dashboard files to user directory
    await copyDirectory(sourceDist, USER_DASHBOARD_DIR);

  } catch (error) {
    throw new Error(`Failed to install dashboard assets: ${error}`);
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