'use client';

import * as React from 'react';
import { ChevronDown, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionSwitcherProps {
  versions: string[];
  currentVersion: string;
  currentSlug: string;
  base: string;
}

export function VersionSwitcher({
  versions,
  currentVersion,
  currentSlug,
  base,
}: VersionSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleVersionChange = (version: string) => {
    const url = `${base}/docs/${version}/${currentSlug}`;
    window.location.href = url;
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm font-mono transition-all duration-200',
          'bg-card text-foreground',
          'hover:border-primary/50 hover:bg-muted',
          open && 'border-primary/50 bg-muted'
        )}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Tag className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-foreground">{currentVersion}</span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg shadow-black/40">
          {versions.map((version) => (
            <button
              key={version}
              onClick={() => handleVersionChange(version)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm font-mono transition-colors duration-150',
                'hover:bg-muted hover:text-foreground',
                version === currentVersion
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {version}
              {version === currentVersion && (
                <span className="text-xs text-primary/60">current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
