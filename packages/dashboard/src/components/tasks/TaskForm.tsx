import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTask } from "@/api/client";
import type { TaskPriority, CreateTaskInput } from "@/types/task";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultProject: string;
  projects: string[];
}

function MetadataFields({
  project, setProject, projects,
  priority, setPriority,
  dueDate, setDueDate,
  context, setContext,
  tags, setTags,
}: {
  project: string; setProject: (v: string) => void; projects: string[];
  priority: TaskPriority; setPriority: (v: TaskPriority) => void;
  dueDate: string; setDueDate: (v: string) => void;
  context: string; setContext: (v: string) => void;
  tags: string; setTags: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Project
        </label>
        <Select value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Priority
        </label>
        <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Due Date
        </label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Context
        </label>
        <Input value={context} onChange={(e) => setContext(e.target.value)} placeholder="work, home…" />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Tags
        </label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
      </div>
    </div>
  );
}

export function TaskForm({ open, onClose, onCreated, defaultProject, projects }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Sync defaultProject when it changes externally
  useEffect(() => {
    setProject(defaultProject);
  }, [defaultProject]);

  // Focus title when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open]);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const reset = () => {
    setTitle("");
    setProject(defaultProject);
    setPriority("medium");
    setTags("");
    setDueDate("");
    setContext("");
    setNotes("");
    setError("");
    setDetailsOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("A title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const input: CreateTaskInput = {
        project: project || defaultProject,
        title: title.trim(),
        priority,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        due_date: dueDate || null,
        context: context.trim() || null,
        notes: notes.trim() || undefined,
      };
      await createTask(input);
      reset();
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog" aria-label="New Task">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/75 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Drawer — full width on mobile, right-anchored on desktop */}
      <div className="relative z-10 ml-auto flex flex-col w-full sm:w-[min(88vw,860px)] h-full bg-card border-l border-border shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/80">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-primary/70" />
            <span className="font-display font-semibold text-sm text-foreground tracking-tight">New Task</span>
          </div>
          <button
            onClick={handleClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Content: two-column on desktop, single column on mobile */}
          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">

            {/* ── Main column: title + notes ─────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Title */}
              <div className="px-5 sm:px-7 pt-5 pb-3">
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  placeholder="Task title…"
                  rows={1}
                  className="w-full bg-transparent text-xl sm:text-2xl font-display font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-none resize-none leading-snug"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                  onKeyDown={(e) => {
                    // Enter focuses notes instead of submitting
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              {/* Divider */}
              <div className="mx-5 sm:mx-7 border-t border-border/60" />

              {/* Notes */}
              <div className="flex-1 flex flex-col px-5 sm:px-7 pt-4 pb-3 min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Notes</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">· markdown</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={"## Context\n\nDescribe what needs to be done, why it matters, and any relevant links or details.\n\n## Acceptance Criteria\n\n- [ ] First condition\n- [ ] Second condition"}
                  className="flex-1 w-full min-h-[220px] sm:min-h-0 bg-muted/20 border border-border/50 rounded-md px-4 py-3 text-sm text-foreground font-mono placeholder:text-muted-foreground/30 resize-none outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors leading-relaxed"
                />
              </div>

              {/* Mobile: collapsible details section */}
              <div className="sm:hidden px-5 pb-3">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex items-center justify-between w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/60 pt-3"
                >
                  <span className="font-mono uppercase tracking-widest text-[10px]">Details</span>
                  {detailsOpen
                    ? <ChevronUp className="h-3.5 w-3.5" />
                    : <ChevronDown className="h-3.5 w-3.5" />
                  }
                </button>
                {detailsOpen && (
                  <div className="mt-3">
                    <MetadataFields
                      project={project} setProject={setProject} projects={projects}
                      priority={priority} setPriority={setPriority}
                      dueDate={dueDate} setDueDate={setDueDate}
                      context={context} setContext={setContext}
                      tags={tags} setTags={setTags}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Desktop metadata sidebar ───────────────────────────── */}
            <div className="hidden sm:flex flex-col w-60 shrink-0 border-l border-border overflow-y-auto">
              <div className="p-5 space-y-5 flex-1">
                <MetadataFields
                  project={project} setProject={setProject} projects={projects}
                  priority={priority} setPriority={setPriority}
                  dueDate={dueDate} setDueDate={setDueDate}
                  context={context} setContext={setContext}
                  tags={tags} setTags={setTags}
                />
              </div>
            </div>
          </div>

          {/* Footer: error + actions */}
          <div className="shrink-0 border-t border-border px-5 sm:px-6 py-3 flex items-center gap-3 bg-card/60">
            <div className="flex-1 min-w-0">
              {error && (
                <p className="text-xs text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded px-2.5 py-1.5 truncate">
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Creating…" : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
