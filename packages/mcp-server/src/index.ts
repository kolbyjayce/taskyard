import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerGitTools } from "./tools/git.js";
import { registerStatusTools } from "./tools/status.js";
import { Watchdog } from "./watchdog/watchdog.js";
import { FileStore } from "./store.js";
import { loadConfig } from "./config.js";

export async function startServer(root: string) {
  const config = await loadConfig(root);
  const store = new FileStore(root, config);
  const server = new McpServer({
    name: "taskyard",
    version: "0.1.0",
  });

  // Register all tool groups
  registerTaskTools(server, store);
  registerGitTools(server, store);
  registerStatusTools(server, store);

  // Start watchdog (heartbeat expiry + stall detection)
  const watchdog = new Watchdog(store, config);
  watchdog.start();

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`taskyard MCP server running — root: ${root}`);
}

// CLI entry: node dist/index.js --root /path/to/repo
const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx !== -1 ? args[rootIdx + 1] : process.cwd();
startServer(root).catch(console.error);
