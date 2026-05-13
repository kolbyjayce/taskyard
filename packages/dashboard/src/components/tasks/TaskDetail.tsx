import { useState, useEffect, useCallback } from "react";
import { X, Trash2, MoveRight, Edit3, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, PriorityBadge, Badge, OverdueBadge, DueSoonBadge } from "@/components/ui/badge";
import { getTask, updateTask, deleteTask, moveTask } from "@/api/client";
import { cn, formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import type { Task, TaskWithBody, TaskStatus, TaskPriority } from "@/types/task";

interface TaskDetailProps {
  task: Task | null;
  projects: string[];
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function TaskDetail({ task, projects, onClose, onUpdated, onDeleted }: TaskDetailProps) {
  const [full, setFull] = useState<TaskWithBody | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false); // mobile metadata toggle in edit mode

  // Editable fields
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [context, setContext] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    if (!task) return;
    try {
      const data = await getTask(task.id, task.project);
      setFull(data);
      setTitle(data.title);
      setStatus(data.status);
      setPriority(data.priority);
      setTags(data.tags.join(", "));
      setDueDate(data.due_date ?? "");
      setContext(data.context ?? "");
      setBody(data.body.trim());
    } catch (e) {
      console.error(e);
    }
  }, [task]);

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setMoving(false);
    setDetailsOpen(false);
    load();
  }, [load]);

  // Escape closes edit mode first, then the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) { setEditing(false); load(); }
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editing, load, onClose]);

  const handleSave = async () => {
    if (!full) return;
    setSaving(true);
    try {
      await updateTask(full.id, full.project, {
        title,
        status,
        priority,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        due_date: dueDate || null,
        context: context || null,
        notes: body,
      } as Parameters<typeof updateTask>[2]);
      onUpdated();
      setEditing(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!full) return;
    setDeleting(true);
    try {
      await deleteTask(full.id, full.project);
      onDeleted();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async () => {
    if (!full || !moveTarget) return;
    try {
      await moveTask(full.id, full.project, moveTarget);
      onUpdated();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!task) return null;

  const currentDue = full?.due_date ?? task.due_date;
  const overdue = isOverdue(currentDue);
  const dueSoon = !overdue && isDueSoon(currentDue);

  // ── Metadata sidebar (shared between desktop and mobile in edit mode) ─────
  const MetaSidebar = () => (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Status</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
          <option value="backlog">Backlog</option>
          <option value="in-progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </Select>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Priority</label>
        <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Due Date</label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Context</label>
        <Input value={context} onChange={(e) => setContext(e.target.value)} placeholder="work, home…" />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">Tags</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
      </div>

      {/* Move / Delete in sidebar */}
      <div className="pt-3 border-t border-border/40 space-y-2">
        {!moving && !confirmDelete && (
          <>
            <button
              onClick={() => setMoving(true)}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/50"
            >
              <MoveRight className="h-3.5 w-3.5" /> Move to project
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors border border-red-900/40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete task
            </button>
          </>
        )}
        {moving && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Move to</span>
              <button onClick={() => { setMoving(false); setMoveTarget(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {projects.filter((p) => p !== task.project).map((p) => (
                <button
                  key={p}
                  onClick={() => setMoveTarget(p)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs text-left transition-all border font-mono truncate",
                    moveTarget === p
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-muted/20 border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/40"
                  )}
                >{p}</button>
              ))}
              {projects.filter((p) => p !== task.project).length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic py-1">No other projects.</p>
              )}
            </div>
            {moveTarget && (
              <Button size="sm" onClick={handleMove} className="w-full">
                <MoveRight className="h-3.5 w-3.5 mr-1.5" />
                Move to <span className="font-mono ml-1">{moveTarget}</span>
              </Button>
            )}
          </div>
        )}
        {confirmDelete && (
          <div className="space-y-2">
            <p className="text-xs text-destructive-foreground">Delete this task?</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="flex-1">
                {deleting ? "Deleting…" : "Confirm"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div
        className={cn(
          "fixed z-40 bg-card border-border shadow-2xl flex flex-col",
          "inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:border-l",
          "sm:w-[min(88vw,860px)]",
          "animate-slide-in-right"
        )}
        aria-label="Edit task"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/80">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-primary/70" />
            <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
            <span className="text-border/60 text-xs">·</span>
            <span className="font-mono text-xs text-muted-foreground">{task.project}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); load(); }} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: two-column on desktop, single column on mobile */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">
          {/* Main: title + notes */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* Title */}
            <div className="px-5 sm:px-7 pt-5 pb-3">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title…"
                rows={1}
                className="w-full bg-transparent text-xl sm:text-2xl font-display font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-none resize-none leading-snug"
                style={{ fieldSizing: "content" } as React.CSSProperties}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); }}
              />
            </div>

            <div className="mx-5 sm:mx-7 border-t border-border/60" />

            {/* Notes */}
            <div className="flex-1 flex flex-col px-5 sm:px-7 pt-4 pb-3 min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Notes</span>
                <span className="text-[10px] text-muted-foreground/40 font-mono">· markdown</span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"## Context\n\nDescribe what needs to be done, why it matters, and any relevant links or details.\n\n## Acceptance Criteria\n\n- [ ] First condition\n- [ ] Second condition"}
                className="flex-1 w-full min-h-[220px] sm:min-h-0 bg-muted/20 border border-border/50 rounded-md px-4 py-3 text-sm text-foreground font-mono placeholder:text-muted-foreground/30 resize-none outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors leading-relaxed"
              />
            </div>

            {/* Mobile: collapsible metadata */}
            <div className="sm:hidden px-5 pb-3">
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex items-center justify-between w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/60 pt-3"
              >
                <span className="font-mono uppercase tracking-widest text-[10px]">Details</span>
                {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {detailsOpen && <div className="mt-3"><MetaSidebar /></div>}
            </div>
          </div>

          {/* Desktop metadata sidebar */}
          <div className="hidden sm:flex flex-col w-60 shrink-0 border-l border-border overflow-y-auto">
            <div className="p-5">
              <MetaSidebar />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "fixed z-40 bg-card border-border shadow-2xl flex flex-col animate-slide-in-right",
        "inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
          <span className="text-border/60">·</span>
          <span className="font-mono text-xs text-muted-foreground">{task.project}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} title="Edit">
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        <h2 className="text-base font-sans font-medium text-foreground leading-snug">
          {full?.title ?? task.title}
        </h2>

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Status</label>
            <StatusBadge status={full?.status ?? task.status} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Priority</label>
            <PriorityBadge priority={full?.priority ?? task.priority} />
          </div>
        </div>

        {/* Due date + Context */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Due Date</label>
            {currentDue ? (
              overdue ? <OverdueBadge date={formatDate(currentDue)} /> :
              dueSoon ? <DueSoonBadge date={formatDate(currentDue)} /> :
              <span className="font-mono text-sm text-foreground">{formatDate(currentDue)}</span>
            ) : (
              <span className="text-muted-foreground/40 text-sm">—</span>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Context</label>
            <span className="font-mono text-sm text-foreground">
              {full?.context ?? <span className="text-muted-foreground/40">—</span>}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Tags</label>
          <div className="flex flex-wrap gap-1">
            {(full?.tags ?? task.tags).length > 0
              ? (full?.tags ?? task.tags).map((tag) => <Badge key={tag} variant="tag">{tag}</Badge>)
              : <span className="text-muted-foreground/40 text-sm">—</span>}
          </div>
        </div>

        {/* Depends on */}
        {(full?.depends_on ?? []).length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">Depends On</label>
            <div className="flex flex-wrap gap-1">
              {(full?.depends_on ?? []).map((dep) => (
                <span key={dep} className="font-mono text-xs text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1.5 block">Notes</label>
          <div className="bg-muted/20 border border-border/50 rounded-md px-3 py-2.5 min-h-[80px]">
            {full?.body?.trim() ? (
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                {full.body.trim()}
              </pre>
            ) : (
              <span className="text-muted-foreground/40 text-xs italic">No notes yet.</span>
            )}
          </div>
        </div>

        {/* Meta footer */}
        <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground font-mono">
          Created by: {full?.created_by ?? task.created_by}
        </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-border">
        {moving ? (
          <div className="px-5 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Move to project</span>
              <button onClick={() => { setMoving(false); setMoveTarget(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
              {projects.filter((p) => p !== task.project).map((p) => (
                <button
                  key={p}
                  onClick={() => setMoveTarget(p)}
                  className={cn(
                    "px-3 py-2 rounded-md text-xs text-left transition-all border font-mono truncate",
                    moveTarget === p
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-muted/20 border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/40"
                  )}
                >{p}</button>
              ))}
              {projects.filter((p) => p !== task.project).length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground/50 italic py-1">No other projects yet.</p>
              )}
            </div>
            {moveTarget && (
              <Button size="sm" onClick={handleMove} className="w-full">
                <MoveRight className="h-3.5 w-3.5 mr-1.5" />
                Move to <span className="font-mono ml-1">{moveTarget}</span>
              </Button>
            )}
          </div>
        ) : confirmDelete ? (
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="text-xs text-destructive-foreground flex-1">Delete this task?</span>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Confirm"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="px-5 py-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMoving(true)} className="flex-1">
              <MoveRight className="h-3.5 w-3.5 mr-1" /> Move
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
