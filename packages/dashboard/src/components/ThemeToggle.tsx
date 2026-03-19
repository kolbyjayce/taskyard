import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: 'light' as const, icon: SunIcon, label: 'Light' },
    { key: 'dark' as const, icon: MoonIcon, label: 'Dark' },
    { key: 'system' as const, icon: ComputerDesktopIcon, label: 'System' }
  ];

  return (
    <div className="flex rounded-lg bg-secondary border border-theme p-1">
      {themes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={`
            flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md smooth-transition
            ${theme === key
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-secondary hover:text-primary hover:bg-hover'
            }
          `}
          title={`Switch to ${label} theme`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}