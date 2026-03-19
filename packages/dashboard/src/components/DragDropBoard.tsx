import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBoardStore, type Task, type TaskStatus } from '../stores/board';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { BoardSkeleton } from './LoadingSkeletons';
import { useState } from 'react';

const COLUMNS: { id: TaskStatus; label: string; description: string }[] = [
  { id: 'backlog', label: 'Backlog', description: 'Tasks waiting to be picked up' },
  { id: 'in-progress', label: 'In Progress', description: 'Currently being worked on' },
  { id: 'review', label: 'Review', description: 'Awaiting review or testing' },
  { id: 'blocked', label: 'Blocked', description: 'Cannot proceed due to dependencies' },
  { id: 'done', label: 'Done', description: 'Completed tasks' },
];

export function DragDropBoard() {
  const { tasks, updateTask, loading } = useBoardStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  if (loading) {
    return <BoardSkeleton />;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(task => task.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getTasksByStatus = (status: TaskStatus): Task[] =>
    tasks.filter(task => task.status === status);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto bg-secondary p-4 md:p-6 custom-scrollbar">
        <div className="flex gap-4 md:gap-6 h-full min-w-max">
          {COLUMNS.map(column => (
            <SortableContext
              key={column.id}
              items={getTasksByStatus(column.id).map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <BoardColumn
                id={column.id}
                title={column.label}
                description={column.description}
                tasks={getTasksByStatus(column.id)}
                taskCount={getTasksByStatus(column.id).length}
              />
            </SortableContext>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 shadow-xl">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}