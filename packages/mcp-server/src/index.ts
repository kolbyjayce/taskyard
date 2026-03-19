import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerGitTools } from "./tools/git.js";
import { registerStatusTools } from "./tools/status.js";
import { Watchdog } from "./watchdog/watchdog.js";
import { FileStore } from "./store.js";
import { loadConfig } from "./config.js";
import { createHttpAdapter } from "./http-adapter.js";
import { createLogger, LogLevel } from "./logger.js";

export async function startServer(root: string, httpPort?: number) {
  const config = await loadConfig(root);

  // Initialize logger with debug level if DEBUG env var is set
  const logLevel = process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO;
  const logger = createLogger("mcp-server", root, logLevel);

  logger.info("Starting taskyard MCP server", { root, httpPort });

  const store = new FileStore(root, config);
  const server = new McpServer({
    name: "taskyard",
    version: "0.1.0",
  });

  // Collect tool handlers for HTTP adapter
  const toolHandlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  // Register all tool groups and collect handlers
  logger.debug("Registering tool groups");
  registerTaskTools(server, store, toolHandlers);
  registerGitTools(server, store, toolHandlers);
  registerStatusTools(server, store, toolHandlers);

  // Start watchdog (heartbeat expiry + stall detection)
  logger.debug("Starting watchdog");
  const watchdog = new Watchdog(store, config);
  watchdog.start();

  // Start HTTP adapter for dashboard if port specified
  if (httpPort) {
    logger.info("Starting HTTP adapter for dashboard", { port: httpPort });
    createHttpAdapter(store, toolHandlers, httpPort);
  }

  // Connect transport
  logger.debug("Connecting MCP transport");
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server ready", { toolCount: toolHandlers.size });
}

// CLI entry: node dist/index.js --root /path/to/repo --http-port 3456
const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx !== -1 ? args[rootIdx + 1] : process.cwd();

const httpPortIdx = args.indexOf("--http-port");
const httpPort = httpPortIdx !== -1 ? parseInt(args[httpPortIdx + 1], 10) : undefined;

startServer(root, httpPort).catch(console.error);
