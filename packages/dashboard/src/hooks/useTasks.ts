import { useState, useEffect, useCallback } from "react";
import { getTasks } from "@/api/client";
import type { Task, TaskFilter } from "@/types/task";

export function useTasks(filter: TaskFilter) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filter);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTasks(JSON.parse(filterKey));
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, loading, error, refresh };
}
