import fs from "fs/promises";
import path from "path";
const DEFAULTS = {
    project: "default",
    version: "0.1.0",
    heartbeat_interval_seconds: 300,
    lock_timeout_seconds: 600,
    stall_threshold_seconds: 1800,
    max_attempts_before_escalation: 3,
    dashboard_port: 3456,
};
export async function loadConfig(root) {
    const configPath = path.join(root, ".taskyard/config.json");
    const raw = await fs.readFile(configPath, "utf-8").catch(() => null);
    if (!raw)
        return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
}
//# sourceMappingURL=config.js.map