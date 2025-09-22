import { Suspense, ReactNode } from 'react';
import { Loading } from '@/components/ui/loading';

interface LoadingSuspenseProps {
  children: ReactNode;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSuspense({ 
  children, 
  message = 'Carregando...', 
  fullScreen = false 
}: LoadingSuspenseProps) {
  return (
    <Suspense fallback={<Loading fullScreen={fullScreen} message={message} />}>
      {children}
    </Suspense>
  );
}

export function LoadingError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-4">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-medium">Erro ao carregar</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export function LoadingRetry({ 
  onRetry, 
  error 
}: { 
  onRetry: () => void;
  error: Error;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-medium">Erro ao carregar</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
