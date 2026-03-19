import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBoardStore } from '../stores/board';
import type { TaskPriority } from '../stores/board';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string; description: string }[] = [
  { value: 'critical', label: 'Critical', description: 'Urgent and blocks other work' },
  { value: 'high', label: 'High', description: 'Important and should be done soon' },
  { value: 'medium', label: 'Medium', description: 'Normal priority' },
  { value: 'low', label: 'Low', description: 'Can be done when time permits' },
];

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { createTask } = useBoardStore();
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium' as TaskPriority,
    tags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await createTask({
        title: formData.title.trim(),
        priority: formData.priority,
        tags,
      });

      // Reset form and close modal
      setFormData({ title: '', priority: 'medium', tags: '' });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ title: '', priority: 'medium', tags: '' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-card border border-theme rounded-xl shadow-xl max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-theme">
            <h2 className="text-lg font-semibold text-primary">Create New Task</h2>
            <button
              onClick={handleClose}
              className="p-1 text-muted hover:text-primary smooth-transition rounded-lg hover:bg-hover"
              disabled={isSubmitting}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-primary mb-2">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 bg-secondary border border-theme rounded-lg text-primary placeholder-muted focus:border-focus focus:ring-1 focus:ring-accent-primary/20 smooth-transition"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    className={`p-3 text-left rounded-lg border smooth-transition ${
                      formData.priority === priority.value
                        ? 'border-focus bg-accent-primary/10 text-accent-primary'
                        : 'border-theme bg-secondary text-secondary hover:border-focus hover:bg-hover'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full priority-${priority.value}`} />
                      <span className="font-medium text-sm">{priority.label}</span>
                    </div>
                    <p className="text-xs text-muted">{priority.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="task-tags" className="block text-sm font-medium text-primary mb-2">
                Tags (optional)
              </label>
              <input
                id="task-tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="frontend, bug, urgent (comma separated)"
                className="w-full px-3 py-2 bg-secondary border border-theme rounded-lg text-primary placeholder-muted focus:border-focus focus:ring-1 focus:ring-accent-primary/20 smooth-transition"
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-hover smooth-transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.title.trim() || isSubmitting}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed smooth-transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}