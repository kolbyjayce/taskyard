import { createServer, IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { FileStore } from "./store.js";
import { registerTaskTools } from "./tools/tasks.js";
import { checkBearerAuth } from "./auth.js";
import { applyCors } from "./cors.js";

class RequestTooLargeError extends Error {}

export interface HttpServerOptions {
  port: number;
  root: string;
}

export interface HttpServerHandle {
  port: number;
  close: () => Promise<void>;
}

export async function startHttpServer(
  opts: HttpServerOptions
): Promise<HttpServerHandle> {
  const store = new FileStore(opts.root);
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req, res) => {
    try {
      applyCors(res);

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }

      if (!(await checkBearerAuth(req, res))) return;

      if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
        await handleMcp(req, res, store, transports);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          })
        );
      }
      console.error(err);
    }
  });

  const port = await new Promise<number>((resolve, reject) => {
    httpServer.listen(opts.port, "0.0.0.0", () => {
      resolve((httpServer.address() as AddressInfo).port);
    });
    httpServer.once("error", reject);
  });

  console.error(`taskyard HTTP server listening on port ${port}`);

  const close = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      for (const [sid, t] of transports) {
        t.close().catch(() => {});
        transports.delete(sid);
      }
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  };

  return { port, close };
}

async function handleMcp(
  req: IncomingMessage,
  res: ServerResponse,
  store: FileStore,
  transports: Map<string, StreamableHTTPServerTransport>
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — reuse transport, stream not yet consumed.
  if (sessionId && transports.has(sessionId)) {
    await transports.get(sessionId)!.handleRequest(req, res);
    return;
  }

  // New session — must be a POST with an initialize request.
  if (!sessionId && req.method === "POST") {
    let body: string;

    try {
      body = await readBody(req);
    } catch (err) {
      if (err instanceof RequestTooLargeError) {
        res.writeHead(413, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Payload too large" },
            id: null,
          })
        );
        return;
      }
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null,
        })
      );
      return;
    }

    if (!isInitializeRequest(parsed)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: expected initialize" },
          id: null,
        })
      );
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) transports.delete(sid);
    };

    const mcpServer = new McpServer({ name: "taskyard", version: "0.1.0" });
    registerTaskTools(mcpServer, store);
    await mcpServer.connect(transport);

    // Pass pre-parsed body so the transport doesn't re-read the consumed stream.
    await transport.handleRequest(req, res, parsed);
    return;
  }

  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: no valid session" },
      id: null,
    })
  );
}

function readBody(
  req: IncomingMessage,
  maxBytes = 4 * 1024 * 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on("data", (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        done = true;
        req.resume();
        reject(new RequestTooLargeError("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!done) resolve(Buffer.concat(chunks).toString("utf-8"));
    })
    req.on("error", (err) => {
      if (!done) reject(err);
    })
  });
}
