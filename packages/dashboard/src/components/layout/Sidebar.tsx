import { useRef, useState, useEffect, useCallback } from "react";
import {
  Layers, FolderOpen, RefreshCw, Plus, Check, X,
  HardDrive, MoreHorizontal, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatus, updateProjectMeta, renameProject, deleteProject } from "@/api/client";
import type { Project } from "@/types/task";

interface SidebarProps {
  projects: Project[];
  selectedProject: string;
  onSelectProject: (project: string) => void;
  onRefresh: () => void;
  onCreateProject: (name: string) => Promise<void>;
  onProjectRenamed: (oldName: string, newName: string) => void;
  onProjectDeleted: (name: string) => void;
  loading: boolean;
}

const VALID_NAME = /^[A-Za-z0-9_-]+$/;

const EMOJIS = [
  "🚀", "⚡", "🎯", "🔥", "💡", "🛠️",
  "📦", "🎨", "🌐", "🔐", "📊", "🗂️",
  "⚙️", "🧪", "🌱", "💎", "🏗️", "🤖",
  "📝", "🎮", "🌊", "🧩", "🔮", "📡",
  "🏠", "🔭", "🎬", "🎵", "🌈", "⭐",
];

const COLORS = [
  { value: "#f59e0b", label: "Amber" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#10b981", label: "Emerald" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#f97316", label: "Orange" },
  { value: "#ec4899", label: "Pink" },
  { value: "#a3e635", label: "Lime" },
  { value: "#94a3b8", label: "Slate" },
];

function ProjectIcon({ project }: { project: Project }) {
  if (project.icon) {
    return (
      <span
        className="inline-flex items-center justify-center h-5 w-5 rounded text-[13px] leading-none shrink-0 select-none"
        style={project.color ? { backgroundColor: `${project.color}22` } : undefined}
      >
        {project.icon}
      </span>
    );
  }
  return (
    <FolderOpen
      className="h-3.5 w-3.5 shrink-0"
      style={project.color ? { color: project.color } : undefined}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/35 mb-1.5 px-0.5">
      {children}
    </p>
  );
}

function PanelDivider() {
  return <div className="mx-2 border-t border-border/40" />;
}

interface EditPanelProps {
  project: Project;
  existingNames: string[];
  onClose: () => void;
  onMetaSaved: () => void;
  onRenamed: (oldName: string, newName: string) => void;
  onDeleted: (name: string) => void;
}

function ProjectEditPanel({
  project,
  existingNames,
  onClose,
  onMetaSaved,
  onRenamed,
  onDeleted,
}: EditPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isDefault = project.name === "default";
  const accentColor = project.color ?? "#f59e0b";

  // Rename state
  const [nameValue, setNameValue] = useState(project.name);
  const [nameError, setNameError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const nameDirty = nameValue !== project.name;

  // Icon / color state (optimistic)
  const [pendingIcon, setPendingIcon] = useState<string | undefined>(project.icon);
  const [pendingColor, setPendingColor] = useState<string | undefined>(project.color);
  const [savingMeta, setSavingMeta] = useState(false);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  // Close on Escape (only if rename input is not focused / not dirty)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (nameDirty) { setNameValue(project.name); setNameError(""); }
        else { onClose(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, nameDirty, project.name]);

  const commitMeta = useCallback(async (icon: string | undefined, color: string | undefined) => {
    setSavingMeta(true);
    try {
      await updateProjectMeta(project.name, { icon, color });
      onMetaSaved();
    } finally {
      setSavingMeta(false);
    }
  }, [project.name, onMetaSaved]);

  const handleEmojiClick = (emoji: string) => {
    const next = pendingIcon === emoji ? undefined : emoji;
    setPendingIcon(next);
    commitMeta(next, pendingColor);
  };

  const handleColorClick = (color: string) => {
    const next = pendingColor === color ? undefined : color;
    setPendingColor(next);
    commitMeta(pendingIcon, next);
  };

  const handleClearMeta = () => {
    setPendingIcon(undefined);
    setPendingColor(undefined);
    commitMeta(undefined, undefined);
  };

  const submitRename = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === project.name) { setNameValue(project.name); return; }
    if (!VALID_NAME.test(trimmed)) {
      setNameError("Letters, numbers, - and _ only");
      nameInputRef.current?.focus();
      return;
    }
    if (existingNames.includes(trimmed)) {
      setNameError("Name already taken");
      nameInputRef.current?.focus();
      return;
    }
    setRenaming(true);
    try {
      await renameProject(project.name, trimmed);
      onRenamed(project.name, trimmed);
      onClose();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Rename failed");
      setRenaming(false);
    }
  };

  const cancelRename = () => {
    setNameValue(project.name);
    setNameError("");
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submitRename(); }
    if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.name);
      onDeleted(project.name);
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const hasMeta = !!(pendingIcon || pendingColor);

  return (
    <div
      ref={panelRef}
      className={cn(
        "mx-1 mb-1.5 rounded-lg border border-border/70 bg-card overflow-hidden",
        "shadow-xl shadow-black/40",
        savingMeta && "opacity-80"
      )}
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-[10px] font-mono text-muted-foreground/60 truncate">{project.name}</span>
        </div>
        <button
          onClick={onClose}
          className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 ml-1"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      <PanelDivider />

      {/* Rename */}
      <div className="p-2">
        <SectionLabel>rename</SectionLabel>
        {isDefault ? (
          <p className="text-[9px] font-mono text-muted-foreground/30 italic px-0.5">
            system project · cannot be renamed
          </p>
        ) : (
          <>
            <div className={cn(
              "flex items-center gap-1 rounded border bg-background/50 px-2 py-1",
              nameError
                ? "border-destructive/50 ring-1 ring-destructive/20"
                : nameDirty
                  ? "border-primary/50 ring-1 ring-primary/20"
                  : "border-border/60"
            )}>
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => { setNameValue(e.target.value); setNameError(""); }}
                onKeyDown={handleNameKeyDown}
                disabled={renaming}
                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/30"
              />
              {nameDirty && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={submitRename}
                    disabled={renaming || !nameValue.trim()}
                    className="h-4 w-4 flex items-center justify-center text-primary hover:text-primary/80 disabled:opacity-30 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={cancelRename}
                    disabled={renaming}
                    className="h-4 w-4 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {nameError && (
              <p className="text-[9px] font-mono text-destructive mt-1 px-0.5">{nameError}</p>
            )}
          </>
        )}
      </div>

      <PanelDivider />

      {/* Icon grid */}
      <div className="p-2">
        <SectionLabel>icon</SectionLabel>
        <div className="grid grid-cols-6 gap-px">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className={cn(
                "h-7 w-full flex items-center justify-center rounded text-[13px]",
                "transition-all duration-100 hover:bg-secondary/80 active:scale-90",
                pendingIcon === emoji && "bg-primary/20 ring-1 ring-primary/50 ring-inset"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <PanelDivider />

      {/* Color swatches */}
      <div className="p-2">
        <SectionLabel>color</SectionLabel>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLORS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              onClick={() => handleColorClick(value)}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-100",
                "hover:scale-110 active:scale-95",
                pendingColor === value
                  ? "ring-2 ring-white/40 ring-offset-2 ring-offset-card scale-110"
                  : "ring-1 ring-black/20"
              )}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>
      </div>

      {/* Clear meta */}
      {hasMeta && (
        <>
          <PanelDivider />
          <div className="px-2 py-1.5">
            <button
              onClick={handleClearMeta}
              className="w-full text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors py-0.5 rounded"
            >
              clear icon &amp; color
            </button>
          </div>
        </>
      )}

      {/* Delete */}
      {!isDefault && (
        <>
          <PanelDivider />
          <div className="px-2 py-2">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5",
                  "text-[10px] font-mono text-muted-foreground/40 hover:text-destructive/70",
                  "transition-colors py-1 rounded hover:bg-destructive/5"
                )}
              >
                <Trash2 className="h-3 w-3" />
                delete project
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] font-mono text-muted-foreground/50 text-center leading-relaxed">
                  Delete <span className="text-foreground/70">"{project.name}"</span> and all its tasks?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className={cn(
                      "py-1 rounded border border-border/60 text-[10px] font-mono",
                      "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      "transition-colors"
                    )}
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={cn(
                      "py-1 rounded text-[10px] font-mono font-medium",
                      "bg-destructive/80 hover:bg-destructive text-destructive-foreground",
                      "transition-colors disabled:opacity-50"
                    )}
                  >
                    {deleting ? "…" : "delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  onRefresh,
  onCreateProject,
  onProjectRenamed,
  onProjectDeleted,
  loading,
}: SidebarProps) {
  const allCount = projects.reduce((sum, p) => sum + p.taskCount, 0);
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);

  useEffect(() => {
    getStatus().then((s) => setWorkingDir(s.root)).catch(() => null);
  }, []);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startCreating = () => {
    setEditingProject(null);
    setName("");
    setNameError("");
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const cancel = () => { setCreating(false); setName(""); setNameError(""); };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { cancel(); return; }
    if (!VALID_NAME.test(trimmed)) {
      setNameError("Letters, numbers, - and _ only");
      inputRef.current?.focus();
      return;
    }
    if (projects.some((p) => p.name === trimmed)) {
      setNameError("Project already exists");
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onCreateProject(trimmed);
      setCreating(false);
      setName("");
      setNameError("");
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  const existingNames = projects.map((p) => p.name);

  return (
    <aside className="w-56 h-full shrink-0 flex flex-col border-r border-border bg-card/50">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 shrink-0">
            <rect width="32" height="32" rx="8" fill="#0b0906"/>
            <rect x="8" y="8" width="7" height="7" rx="2" fill="#f59e0b" opacity="0.9"/>
            <rect x="17" y="8" width="7" height="7" rx="2" fill="#f59e0b" opacity="0.5"/>
            <rect x="8" y="17" width="7" height="7" rx="2" fill="#f59e0b" opacity="0.5"/>
            <rect x="17" y="17" width="7" height="7" rx="2" fill="#f59e0b" opacity="0.25"/>
          </svg>
          <div>
            <span className="font-display text-base font-700 text-foreground tracking-tight leading-none block">
              taskyard
            </span>
            <span className="text-[10px] text-muted-foreground font-mono leading-none block mt-0.5">dashboard</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-3 mb-1">

          {/* Section header */}
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Projects
            </p>
            <button
              onClick={startCreating}
              disabled={creating}
              title="New project"
              className={cn(
                "h-4 w-4 flex items-center justify-center rounded transition-colors",
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Inline new-project input */}
          {creating && (
            <div className="mb-2 px-2">
              <div className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 bg-background/60",
                nameError ? "border-destructive/60" : "border-primary/50 ring-1 ring-primary/20"
              )}>
                <FolderOpen className="h-3 w-3 text-primary/60 shrink-0" />
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="project-name"
                  disabled={saving}
                  className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
                />
                <button onClick={submit} disabled={saving || !name.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30 transition-colors">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={cancel} disabled={saving} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {nameError && (
                <p className="text-[10px] text-destructive mt-1 px-1 font-mono">{nameError}</p>
              )}
            </div>
          )}

          {/* All tasks */}
          <button
            onClick={() => { setEditingProject(null); onSelectProject("all"); }}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
              selectedProject === "all"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              All Tasks
            </span>
            <span className="font-mono text-xs opacity-70">{allCount}</span>
          </button>

          {/* Per-project */}
          <div className="mt-1 space-y-0.5">
            {projects.map((p) => {
              const isSelected = selectedProject === p.name;
              const isEditing = editingProject === p.name;

              return (
                <div key={p.name}>
                  {/* Row */}
                  <div className={cn(
                    "group flex items-center rounded-md transition-colors",
                    isSelected
                      ? "bg-primary/15"
                      : isEditing
                        ? "bg-secondary"
                        : "hover:bg-secondary"
                  )}>
                    {/* Select button (icon + name) */}
                    <button
                      onClick={() => onSelectProject(p.name)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm min-w-0",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <ProjectIcon project={p} />
                      <span className="truncate">{p.name}</span>
                    </button>

                    {/* Count / edit toggle */}
                    <div className="relative flex items-center justify-center shrink-0 pr-2">
                      {/* Count: desktop only — fades on group-hover */}
                      <span className={cn(
                        "hidden sm:block font-mono text-xs transition-opacity duration-150 pointer-events-none select-none",
                        isSelected ? "text-primary/70" : "text-muted-foreground/70",
                        "sm:group-hover:opacity-0",
                        isEditing && "sm:opacity-0"
                      )}>
                        {p.taskCount}
                      </span>
                      {/* Edit button:
                          Mobile  — always visible at 50% opacity, inline in flow.
                          Desktop — absolutely positioned over the count, hidden until hover. */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(isEditing ? null : p.name);
                        }}
                        title="Project settings"
                        className={cn(
                          "flex items-center justify-center h-5 w-5 rounded",
                          "transition-all duration-150",
                          "opacity-50",
                          "sm:absolute sm:inset-0 sm:h-auto sm:w-auto sm:opacity-0 sm:group-hover:opacity-100",
                          isEditing && "opacity-100 sm:opacity-100",
                          isSelected
                            ? "text-primary/70 hover:text-primary hover:bg-primary/10"
                            : "text-muted-foreground/60 hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10"
                        )}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit panel */}
                  {isEditing && (
                    <ProjectEditPanel
                      project={p}
                      existingNames={existingNames.filter((n) => n !== p.name)}
                      onClose={() => setEditingProject(null)}
                      onMetaSaved={onRefresh}
                      onRenamed={(oldName, newName) => {
                        setEditingProject(null);
                        onProjectRenamed(oldName, newName);
                      }}
                      onDeleted={(name) => {
                        setEditingProject(null);
                        onProjectDeleted(name);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Working directory + Refresh */}
      <div className="px-4 py-3 border-t border-border space-y-2.5">
        {workingDir && (
          <div className="flex items-start gap-1.5 min-w-0">
            <HardDrive className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
            <span className="text-[10px] font-mono text-muted-foreground/60 leading-tight break-all" title={workingDir}>
              {workingDir}
            </span>
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>
    </aside>
  );
}
