import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { ActivityFeed } from "./components/ActivityFeed";
import { TaskDetail } from "./components/TaskDetail";
import { Header } from "./components/Header";
import { ThemeProvider } from "./components/ThemeProvider";
import { FloatingActionButton } from "./components/FloatingActionButton";
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
    <ThemeProvider>
      <div className="flex h-screen bg-primary text-primary font-mono overflow-hidden">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <Header />
          <Board />
        </main>
        <aside className="hidden lg:flex w-80 border-l border-theme flex-col">
          {selectedTaskId ? <TaskDetail taskId={selectedTaskId} /> : <ActivityFeed />}
        </aside>
        <FloatingActionButton />
      </div>
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: 'var(--accent-success)',
              secondary: 'var(--bg-card)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--accent-danger)',
              secondary: 'var(--bg-card)',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;
