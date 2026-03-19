import fs from "fs/promises";
import path from "path";

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

export class Logger {
  private logLevel: LogLevel;
  private logFile: string | undefined;
  private component: string;

  constructor(component: string, logLevel: LogLevel = LogLevel.INFO, logFile?: string) {
    this.component = component;
    this.logLevel = logLevel;
    this.logFile = logFile;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const logLine = `${entry.timestamp} [${entry.level}] ${entry.component}: ${entry.message}${
      entry.data ? ` ${JSON.stringify(entry.data)}` : ""
    }\n`;

    // Always write to console for now
    if (entry.level === "ERROR" || entry.level === "WARN") {
      console.error(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    // Write to file if configured
    if (this.logFile) {
      try {
        await fs.appendFile(this.logFile, logLine);
      } catch (error) {
        console.error(`Failed to write to log file: ${error}`);
      }
    }
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
  child(childComponent: string): Logger {
    const fullComponent = `${this.component}:${childComponent}`;
    return new Logger(fullComponent, this.logLevel, this.logFile);
  }
}

// Factory function to create loggers with consistent configuration
export function createLogger(
  component: string,
  root?: string,
  logLevel: LogLevel = LogLevel.INFO
): Logger {
  const logFile = root ? path.join(root, ".taskyard", "logs", "mcp-server.log") : undefined;

  // Ensure log directory exists
  if (logFile) {
    const logDir = path.dirname(logFile);
    fs.mkdir(logDir, { recursive: true }).catch(() => {
      // Ignore errors, will fall back to console only
    });
  }

  return new Logger(component, logLevel, logFile);
}

// Global logger instance for backward compatibility
export const logger = new Logger("taskyard");