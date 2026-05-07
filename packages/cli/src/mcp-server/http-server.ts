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

const MAX_SESSIONS = 100;
const IDLE_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

class RequestTooLargeError extends Error {}

interface TransportEntry {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

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
  const transports = new Map<string, TransportEntry>();

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [sid, entry] of transports) {
      if (now - entry.lastActivity > IDLE_MS) {
        entry.transport.close().catch(() => {});
        transports.delete(sid);
      }
    }
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

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
    clearInterval(sweeper);
    return new Promise((resolve, reject) => {
      for (const [sid, entry] of transports) {
        entry.transport.close().catch(() => {});
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
  transports: Map<string, TransportEntry>
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — reuse transport, stream not yet consumed.
  if (sessionId && transports.has(sessionId)) {
    const entry = transports.get(sessionId)!;
    entry.lastActivity = Date.now();
    await entry.transport.handleRequest(req, res);
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

    // Enforce session cap: evict the oldest idle session to make room.
    if (transports.size >= MAX_SESSIONS) {
      let oldestSid: string | undefined;
      let oldestTime = Infinity;
      for (const [sid, entry] of transports) {
        if (entry.lastActivity < oldestTime) {
          oldestTime = entry.lastActivity;
          oldestSid = sid;
        }
      }
      if (oldestSid) {
        transports.get(oldestSid)!.transport.close().catch(() => {});
        transports.delete(oldestSid);
      } else {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Server at session capacity" },
            id: null,
          })
        );
        return;
      }
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, { transport, lastActivity: Date.now() });
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
