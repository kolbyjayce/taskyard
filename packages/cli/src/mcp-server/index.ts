import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTaskTools } from "./tools/tasks.js";
import { FileStore } from "./store.js";

export async function startServer(root: string) {
  const store = new FileStore(root);
  const server = new McpServer({ name: "taskyard", version: "0.1.0" });

  registerTaskTools(server, store);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx !== -1 ? args[rootIdx + 1] : process.cwd();

startServer(root).catch(console.error);
