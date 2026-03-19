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
      process.stdout.write(chalk.yellow("Taskyard daemon is not running\n"));
      return;
    }

    process.stdout.write("Stopping taskyard daemon...\n");
    await daemon.stop();
    process.stdout.write(chalk.green("✓ Taskyard daemon stopped\n"));
  } catch (error) {
    logger.error("Failed to stop daemon", { error: String(error) });
    process.stderr.write(chalk.red(`Failed to stop daemon: ${error}\n`));
    process.exit(1);
  }
}