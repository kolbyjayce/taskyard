import { ThemeToggle } from './ThemeToggle';
import { useBoardStore } from '../stores/board';

export function Header() {
  const { project } = useBoardStore();

  return (
    <header className="bg-secondary border-b border-theme px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-primary">Taskyard</h1>
        <div className="text-muted text-sm">
          Project: <span className="text-secondary font-mono">{project}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}