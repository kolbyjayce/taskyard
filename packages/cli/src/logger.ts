import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  data?: any;
}

export class CLILogger {
  private logLevel: LogLevel;
  private logFile: string | undefined;
  private component: string;
  private silent: boolean;

  constructor(
    component: string,
    logLevel: LogLevel = LogLevel.INFO,
    logFile?: string,
    silent = false
  ) {
    this.component = component;
    this.logLevel = logLevel;
    this.logFile = logFile;
    this.silent = silent;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const logLine = `${entry.timestamp} [${entry.level}] ${entry.component}: ${entry.message}${
      entry.data ? ` ${JSON.stringify(entry.data)}` : ""
    }\n`;

    // Write to console with colors (unless silent)
    if (!this.silent) {
      const coloredLine = this.formatForConsole(entry);
      if (entry.level === "ERROR" || entry.level === "WARN") {
        console.error(coloredLine);
      } else {
        console.log(coloredLine);
      }
    }

    // Write to file if configured
    if (this.logFile) {
      try {
        await fs.appendFile(this.logFile, logLine);
      } catch (error) {
        // Don't fail CLI operations if logging fails
      }
    }
  }

  private formatForConsole(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const component = chalk.dim(`[${entry.component}]`);
    let levelColor = chalk.white;

    switch (entry.level) {
      case "ERROR":
        levelColor = chalk.red;
        break;
      case "WARN":
        levelColor = chalk.yellow;
        break;
      case "INFO":
        levelColor = chalk.blue;
        break;
      case "DEBUG":
        levelColor = chalk.gray;
        break;
    }

    const level = levelColor(`[${entry.level}]`);
    return `${chalk.dim(time)} ${level} ${component} ${entry.message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
    };
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.createLogEntry("DEBUG", message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.createLogEntry("INFO", message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.createLogEntry("WARN", message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.createLogEntry("ERROR", message, data));
    }
  }

  // Create child logger for sub-components
  child(childComponent: string): CLILogger {
    const fullComponent = `${this.component}:${childComponent}`;
    return new CLILogger(fullComponent, this.logLevel, this.logFile, this.silent);
  }

  // Create a silent version for operations that shouldn't clutter output
  createSilent(): CLILogger {
    return new CLILogger(this.component, this.logLevel, this.logFile, true);
  }
}

// Factory function to create CLI loggers
export function createCLILogger(
  component: string,
  root?: string,
  logLevel: LogLevel = LogLevel.INFO
): CLILogger {
  const logFile = root ? path.join(root, ".taskyard", "logs", "cli.log") : undefined;

  // Ensure log directory exists
  if (logFile) {
    const logDir = path.dirname(logFile);
    fs.mkdir(logDir, { recursive: true }).catch(() => {
      // Ignore errors, will fall back to console only
    });
  }

  return new CLILogger(component, logLevel, logFile);
}

// Global CLI logger instance
export const cliLogger = new CLILogger("taskyard-cli");