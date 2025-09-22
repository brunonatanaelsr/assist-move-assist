import React from 'react';
import { cn } from '@/lib/utils';

type Step = { label: string };

type Props = {
  steps: Step[];
  current: number;
  onChange?: (index: number) => void;
};

export function Stepper({ steps, current, onChange }: Props) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
      {steps.map((s, i) => (
        <button
          key={s.label + i}
          className={cn(
            'flex-1 h-2 rounded transition-colors',
            i <= current ? 'bg-primary' : 'bg-muted'
          )}
          onClick={() => onChange?.(i)}
          aria-label={`Ir para etapa ${i + 1}: ${s.label}`}
        />
      ))}
    </div>
  );
}

export default Stepper;

