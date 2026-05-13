import type {
  Task,
  TaskWithBody,
  Project,
  TaskFilter,
  CreateTaskInput,
} from "@/types/task";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getStatus(): Promise<{ root: string }> {
  return request<{ root: string }>("/status");
}

export async function getProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export async function createProject(name: string): Promise<{ name: string }> {
  return request<{ name: string }>("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateProjectMeta(
  name: string,
  meta: { icon?: string; color?: string }
): Promise<void> {
  return request<void>(`/projects/${encodeURIComponent(name)}/meta`, {
    method: "PUT",
    body: JSON.stringify(meta),
  });
}

export async function renameProject(
  oldName: string,
  newName: string
): Promise<{ name: string }> {
  return request<{ name: string }>(`/projects/${encodeURIComponent(oldName)}`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName }),
  });
}

export async function deleteProject(name: string): Promise<void> {
  return request<void>(`/projects/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filter.project) params.set("project", filter.project);
  if (filter.status) params.set("status", filter.status);
  if (filter.priority) params.set("priority", filter.priority);
  if (filter.context) params.set("context", filter.context);
  if (filter.tag) params.set("tag", filter.tag);
  if (filter.excludeDone) params.set("exclude_done", "1");
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  if (filter.offset !== undefined) params.set("offset", String(filter.offset));
  return request<Task[]>(`/tasks?${params}`);
}

export async function getTask(id: string, project: string): Promise<TaskWithBody> {
  return request<TaskWithBody>(`/tasks/${id}?project=${encodeURIComponent(project)}`);
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  project: string,
  patch: Partial<Task>
): Promise<Task> {
  return request<Task>(`/tasks/${id}?project=${encodeURIComponent(project)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteTask(id: string, project: string): Promise<void> {
  return request<void>(`/tasks/${id}?project=${encodeURIComponent(project)}`, {
    method: "DELETE",
  });
}

export async function moveTask(
  id: string,
  fromProject: string,
  toProject: string
): Promise<Task> {
  return request<Task>(`/tasks/${id}/move?project=${encodeURIComponent(fromProject)}`, {
    method: "POST",
    body: JSON.stringify({ to_project: toProject }),
  });
}
