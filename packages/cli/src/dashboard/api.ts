import type { IncomingMessage, ServerResponse } from "node:http";
import type { FileStore } from "../mcp-server/store.js";

/**
 * Handles dashboard REST API requests (routes under /api/).
 * Returns true if the request was handled, false if it was not an API route.
 */
export async function handleDashboardApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  store: FileStore
): Promise<boolean> {
  if (!url.pathname.startsWith("/api/")) return false;

  const json = (code: number, body: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const segments = url.pathname
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean);

  const method = req.method ?? "GET";

  try {
    // GET /api/projects
    if (segments[0] === "projects" && segments.length === 1 && method === "GET") {
      json(200, await store.listProjects());
      return true;
    }

    // POST /api/projects
    if (segments[0] === "projects" && segments.length === 1 && method === "POST") {
      const { name } = JSON.parse(await readBody(req)) as { name?: string };
      if (!name) { json(400, { error: "name required" }); return true; }
      await store.createProject(name);
      json(201, { name });
      return true;
    }

    // PATCH /api/projects/:name — rename
    if (segments[0] === "projects" && segments.length === 2 && method === "PATCH") {
      const oldName = segments[1];
      const { name: newName } = JSON.parse(await readBody(req)) as { name?: string };
      if (!newName) { json(400, { error: "name required" }); return true; }
      await store.renameProject(oldName, newName);
      json(200, { name: newName });
      return true;
    }

    // DELETE /api/projects/:name
    if (segments[0] === "projects" && segments.length === 2 && method === "DELETE") {
      const projectName = segments[1];
      await store.deleteProject(projectName);
      res.writeHead(204);
      res.end();
      return true;
    }

    // PUT /api/projects/:name/meta
    if (segments[0] === "projects" && segments.length === 3 && segments[2] === "meta" && method === "PUT") {
      const projectName = segments[1];
      const body = JSON.parse(await readBody(req)) as { icon?: string; color?: string };
      await store.writeProjectMeta(projectName, {
        icon: typeof body.icon === "string" ? body.icon : undefined,
        color: typeof body.color === "string" ? body.color : undefined,
      });
      json(200, body);
      return true;
    }

    if (segments[0] === "tasks") {
      // GET /api/tasks
      if (segments.length === 1 && method === "GET") {
        const project = url.searchParams.get("project") ?? "default";
        const status = url.searchParams.get("status") ?? undefined;
        const priority = url.searchParams.get("priority") ?? undefined;
        const context = url.searchParams.get("context") ?? undefined;
        const tag = url.searchParams.get("tag") ?? undefined;
        const excludeDone = url.searchParams.get("exclude_done") === "1";
        const limitParam = url.searchParams.get("limit");
        const offsetParam = url.searchParams.get("offset");
        const limit = limitParam !== null ? Math.max(1, parseInt(limitParam, 10)) : undefined;
        const offset = offsetParam !== null ? Math.max(0, parseInt(offsetParam, 10)) : 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let tasks = await store.listTasks(project, { status, priority, context, tag } as any);
        if (excludeDone) tasks = tasks.filter((t) => t.status !== "done");
        if (limit !== undefined) tasks = tasks.slice(offset, offset + limit);
        json(200, tasks);
        return true;
      }

      // POST /api/tasks
      if (segments.length === 1 && method === "POST") {
        const data = JSON.parse(await readBody(req)) as {
          project?: string;
          title: string;
          [key: string]: unknown;
        };
        const task = await store.createTask(
          data.project ?? "default",
          data as Parameters<typeof store.createTask>[1]
        );
        json(201, task);
        return true;
      }

      const taskId = segments[1];

      // GET /api/tasks/:id
      if (segments.length === 2 && method === "GET") {
        const project = url.searchParams.get("project");
        if (!project) { json(400, { error: "project query param required" }); return true; }
        json(200, await store.readTask(project, taskId));
        return true;
      }

      // PUT /api/tasks/:id
      if (segments.length === 2 && method === "PUT") {
        const project = url.searchParams.get("project");
        if (!project) { json(400, { error: "project query param required" }); return true; }
        const patch = JSON.parse(await readBody(req));
        json(200, await store.updateTask(project, taskId, patch));
        return true;
      }

      // DELETE /api/tasks/:id
      if (segments.length === 2 && method === "DELETE") {
        const project = url.searchParams.get("project");
        if (!project) { json(400, { error: "project query param required" }); return true; }
        await store.deleteTask(project, taskId);
        res.writeHead(204);
        res.end();
        return true;
      }

      // POST /api/tasks/:id/move
      if (segments.length === 3 && segments[2] === "move" && method === "POST") {
        const fromProject = url.searchParams.get("project");
        if (!fromProject) { json(400, { error: "project query param required" }); return true; }
        const { to_project } = JSON.parse(await readBody(req)) as { to_project?: string };
        if (!to_project) { json(400, { error: "to_project required in body" }); return true; }
        json(200, await store.moveTask(fromProject, taskId, to_project));
        return true;
      }
    }

    // GET /api/status
    if (segments[0] === "status" && segments.length === 1 && method === "GET") {
      json(200, { root: store.root });
      return true;
    }

    json(404, { error: "Not found" });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) json(500, { error: message });
    return true;
  }
}

function readBody(req: IncomingMessage, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) { req.resume(); reject(new Error("Payload too large")); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
