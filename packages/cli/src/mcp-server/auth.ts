import { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";

/**
 * Returns true if the request is authorized (or auth is not configured).
 * Returns false and writes a 401 response if auth fails.
 *
 * Auth source today: TASKYARD_AUTH_TOKEN env var (static bearer token).
 * To extend: replace this function body with JWT introspection, OAuth, SAML,
 * or multi-token SQLite lookup — the async signature supports any strategy.
 */
export async function checkBearerAuth(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const expected = process.env["TASKYARD_AUTH_TOKEN"];

  // No token configured → unauthenticated mode, always allow.
  if (!expected) return true;

  const header = req.headers["authorization"] ?? "";
  const provided = /^Bearer (.+)$/i.exec(header)?.[1] ?? "";

  // timingSafeEqual requires same-length buffers; reject immediately if lengths differ.
  const expectedBuf = Buffer.from(expected, "utf-8");
  const providedBuf = Buffer.from(provided, "utf-8");

  const valid =
    expectedBuf.byteLength === providedBuf.byteLength &&
    timingSafeEqual(expectedBuf, providedBuf);

  if (!valid) {
    res.writeHead(401, {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Bearer realm="taskyard"',
    });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return false;
  }

  return true;
}
