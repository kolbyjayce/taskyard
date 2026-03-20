import os from "os";
import path from "path";

export const USER_DIR = path.join(os.homedir(), ".taskyard");
export const USER_DASHBOARD_DIR = path.join(USER_DIR, "dashboard");

/**
 * Get the path where dashboard assets are stored
 */
export function getDashboardPath(): string {
  return USER_DASHBOARD_DIR;
}