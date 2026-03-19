import chalk from "chalk";
import { createDaemonManager } from "../daemon.js";
import { createCLILogger } from "../logger.js";

export async function stopCommand() {
  const root = process.cwd();
  const logger = createCLILogger("stop", root);
  const daemon = createDaemonManager(root);

  try {
    const status = await daemon.status();
    if (!status.running) {
      console.log(chalk.yellow("Taskyard daemon is not running"));
      return;
    }

    console.log("Stopping taskyard daemon...");
    await daemon.stop();
    console.log(chalk.green("✓ Taskyard daemon stopped"));
  } catch (error) {
    logger.error("Failed to stop daemon", { error: String(error) });
    console.error(chalk.red(`Failed to stop daemon: ${error}`));
    process.exit(1);
  }
}