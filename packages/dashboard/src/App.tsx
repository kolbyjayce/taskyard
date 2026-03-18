import { useEffect } from "react";
import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { ActivityFeed } from "./components/ActivityFeed";
import { TaskDetail } from "./components/TaskDetail";
import { useBoardStore } from "./stores/board";

function App() {
  const { fetchTasks, selectedTaskId } = useBoardStore();

  useEffect(() => {
    fetchTasks();
    // Poll every 10s — cheap since it's just reading local files via MCP
    const interval = setInterval(fetchTasks, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-mono overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Board />
      </main>
      <aside className="w-80 border-l border-zinc-800 flex flex-col">
        {selectedTaskId ? <TaskDetail taskId={selectedTaskId} /> : <ActivityFeed />}
      </aside>
    </div>
  );
}

export default App;
