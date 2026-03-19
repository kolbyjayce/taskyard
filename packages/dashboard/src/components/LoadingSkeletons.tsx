import { motion } from "framer-motion";

export function TaskCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full p-4 rounded-lg border border-theme bg-card"
    >
      {/* Header row skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-muted/30 rounded-full animate-pulse" />
        <div className="w-16 h-4 bg-muted/30 rounded animate-pulse" />
        <div className="flex-1" />
        <div className="w-12 h-3 bg-muted/30 rounded animate-pulse" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-1 mb-3">
        <div className="w-full h-4 bg-muted/30 rounded animate-pulse" />
        <div className="w-3/4 h-4 bg-muted/30 rounded animate-pulse" />
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-5 bg-muted/30 rounded animate-pulse" />
        <div className="w-16 h-5 bg-muted/30 rounded animate-pulse" />
      </div>
    </motion.div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex-1 overflow-x-auto bg-secondary p-6">
      <div className="flex gap-6 h-full min-w-max">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col w-72 min-h-0 bg-card rounded-lg border border-theme">
            {/* Column Header Skeleton */}
            <div className="p-4 border-b border-theme">
              <div className="flex items-center justify-between mb-1">
                <div className="w-20 h-4 bg-muted/30 rounded animate-pulse" />
                <div className="w-6 h-4 bg-muted/30 rounded-full animate-pulse" />
              </div>
              <div className="w-32 h-3 bg-muted/30 rounded animate-pulse" />
            </div>

            {/* Task Cards Skeleton */}
            <div className="flex-1 p-3 space-y-2">
              {Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => (
                <TaskCardSkeleton key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <nav className="w-64 border-r border-theme bg-secondary flex flex-col py-6 px-4 gap-6 flex-shrink-0">
      {/* Wordmark skeleton */}
      <div className="px-2">
        <div className="w-20 h-5 bg-muted/30 rounded animate-pulse mb-1" />
        <div className="w-32 h-3 bg-muted/30 rounded animate-pulse" />
      </div>

      {/* Projects skeleton */}
      <div>
        <div className="w-16 h-4 bg-muted/30 rounded animate-pulse mb-3 px-2" />
        <div className="space-y-1">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="w-full h-10 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="flex-1">
        <div className="w-20 h-4 bg-muted/30 rounded animate-pulse mb-3 px-2" />
        <div className="space-y-2 px-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <div className="w-16 h-3 bg-muted/30 rounded animate-pulse" />
              <div className="w-6 h-4 bg-muted/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}