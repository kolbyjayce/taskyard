import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '../stores/board';
import { DraggableTaskCard } from './DraggableTaskCard';

interface BoardColumnProps {
  id: TaskStatus;
  title: string;
  description: string;
  tasks: Task[];
  taskCount: number;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  'backlog': 'border-t-muted',
  'in-progress': 'border-t-accent-primary',
  'review': 'border-t-accent-warning',
  'blocked': 'border-t-accent-danger',
  'done': 'border-t-accent-success',
};

export function BoardColumn({ id, title, description, tasks, taskCount }: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col w-64 sm:w-72 min-h-0 bg-card rounded-lg border border-theme
        border-t-2 ${STATUS_STYLES[id]} smooth-transition
        ${isOver ? 'bg-hover shadow-lg ring-1 ring-accent-primary/50' : ''}
      `}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-theme">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
            {title}
          </h3>
          <span className="text-xs text-muted bg-tertiary px-2 py-1 rounded-full font-medium">
            {taskCount}
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {/* Task List */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        {isEmpty ? (
          <div className={`
            h-32 border-2 border-dashed rounded-lg flex items-center justify-center
            ${isOver ? 'border-accent-primary bg-accent-primary/5' : 'border-theme'}
            smooth-transition
          `}>
            <p className="text-xs text-muted text-center">
              {isOver ? 'Drop task here' : 'No tasks'}
            </p>
          </div>
        ) : (
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map(task => (
                <DraggableTaskCard key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}