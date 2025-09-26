import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Correct relative imports for tested components
import { ErrorBoundary } from '../ErrorBoundary';
import { Loading } from '../ui/loading';
import { LoadingSuspense, LoadingError, LoadingRetry } from '../ui/loading-suspense';

// Mock dos hooks necessários
vi.mock('@/hooks/usePostgreSQLAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User' },
    loading: false
  })
}));

describe('ErrorBoundary Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
    expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
  });

  it('should show detailed error in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should retry on button click', async () => {
    const ThrowError = () => {
      throw new Error('Test Error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText(/tentar novamente/i);
    await userEvent.click(retryButton);

    // O componente deve tentar renderizar novamente
    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
  });
});

describe('Loading Component Tests', () => {
  it('should render basic loading state', () => {
    render(<Loading />);
    
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render full screen loading', () => {
    render(<Loading fullScreen />);
    
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('should show custom message', () => {
    const message = 'Custom Loading Message';
    render(<Loading message={message} />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should show overlay with blur', () => {
    render(<Loading fullScreen />);

    const overlay = document.querySelector('.backdrop-blur-sm');
    expect(overlay).not.toBeNull();
  });
});

describe('LoadingSuspense Tests', () => {
  it('should render loading state initially', async () => {
    const TestComponent = () => {
      throw Promise.resolve(); // Simular Suspense
      return null;
    };

    render(
      <LoadingSuspense>
        <TestComponent />
      </LoadingSuspense>
    );

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should show custom loading message', () => {
    const message = 'Custom Suspense Message';
    const TestComponent = () => {
      throw Promise.resolve();
      return null;
    };

    render(
      <LoadingSuspense message={message}>
        <TestComponent />
      </LoadingSuspense>
    );

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should render children after resolve', async () => {
    const TestComponent = () => {
      return <div>Content Loaded</div>;
    };

    render(
      <LoadingSuspense>
        <TestComponent />
      </LoadingSuspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Content Loaded')).toBeInTheDocument();
    });
  });

  it('should render error state', () => {
    const error = new Error('Test Error');
    render(<LoadingError error={error} />);

    expect(screen.getByText(/Erro ao carregar/i)).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('should handle retry action', async () => {
    const onRetry = vi.fn();
    const error = new Error('Test Error');

    render(<LoadingRetry error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText(/Tentar novamente/i);
    await userEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });
});
