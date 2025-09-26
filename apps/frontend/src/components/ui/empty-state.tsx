import React from 'react';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, actionLabel, onAction, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          className="mt-4 inline-flex items-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
      <div className="sr-only" aria-live="polite">Sem dados para exibir</div>
    </div>
  );
}

export default EmptyState;

