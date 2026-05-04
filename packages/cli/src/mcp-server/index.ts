import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
  const server = new McpServer({ name: "taskyard", version: "0.1.0" });
  registerTaskTools(server, store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
