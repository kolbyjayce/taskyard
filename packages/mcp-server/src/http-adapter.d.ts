import http from "http";
import type { FileStore } from "./store.js";
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
export declare function createHttpAdapter(store: FileStore, toolHandlers: Map<string, ToolHandler>, port: number): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export {};
//# sourceMappingURL=http-adapter.d.ts.map