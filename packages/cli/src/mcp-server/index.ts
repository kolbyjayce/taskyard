import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { registerTaskTools } from "./tools/tasks.js";
import { FileStore } from "./store.js";
import { startHttpServer } from "./http-server.js";

export interface ServerOptions {
  root: string;
  transport: "stdio" | "http";
  port: number;
}

export async function startServer(options: ServerOptions): Promise<void> {
  if (options.transport === "http") {
    const { close } = await startHttpServer({ port: options.port, root: options.root });
    for (const sig of ["SIGINT", "SIGTERM"] as const) {
      process.on(sig, () => close().finally(() => process.exit(0)));
    }
    return;
  }

  const store = new FileStore(options.root);
  const server = new McpServer({ name: "taskyard", version: "1.0.1" });
  registerTaskTools(server, store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run when executed directly, not when imported by the CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--root");
  const rootArg = rootIdx !== -1 ? args[rootIdx + 1] : undefined;
  const root = rootArg && !rootArg.startsWith("-") ? rootArg : process.cwd();
  startServer({ root, transport: "stdio", port: 3000 }).catch(console.error);
}
