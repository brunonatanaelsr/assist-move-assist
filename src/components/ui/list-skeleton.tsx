import React from 'react';

type Props = { rows?: number; columns?: number };

export function ListSkeleton({ rows = 8, columns = 5 }: Props) {
  return (
    <div role="status" aria-live="polite" className="p-4">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, c) => (
              <div key={c} className="h-4 rounded bg-muted animate-pulse" />)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ListSkeleton;

