import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Simple mock data for now
    setTasks([
      { id: "1", title: "Example Task", status: "backlog" }
    ]);
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-white font-mono overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-400">Taskyard Dashboard</h1>
          <p className="text-gray-400 mt-2">Task management for AI agents</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Backlog</h2>
            <div className="space-y-3">
              {tasks.filter(t => t.status === "backlog").map(task => (
                <div key={task.id} className="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
                  <h3 className="font-medium">{task.title}</h3>
                </div>
              ))}
              {tasks.filter(t => t.status === "backlog").length === 0 && (
                <p className="text-gray-500 text-sm">No tasks in backlog</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">In Progress</h2>
            <div className="space-y-3">
              {tasks.filter(t => t.status === "in-progress").map(task => (
                <div key={task.id} className="bg-gray-700 p-3 rounded border-l-4 border-yellow-500">
                  <h3 className="font-medium">{task.title}</h3>
                </div>
              ))}
              {tasks.filter(t => t.status === "in-progress").length === 0 && (
                <p className="text-gray-500 text-sm">No tasks in progress</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Done</h2>
            <div className="space-y-3">
              {tasks.filter(t => t.status === "done").map(task => (
                <div key={task.id} className="bg-gray-700 p-3 rounded border-l-4 border-green-500">
                  <h3 className="font-medium">{task.title}</h3>
                </div>
              ))}
              {tasks.filter(t => t.status === "done").length === 0 && (
                <p className="text-gray-500 text-sm">No completed tasks</p>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Drop task files in the <code className="bg-gray-800 px-2 py-1 rounded">tasks/</code> directory to get started</p>
        </footer>
      </main>
    </div>
  );
}

export default App;