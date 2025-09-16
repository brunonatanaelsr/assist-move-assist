import { render } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import React from 'react';
import { vi } from 'vitest';

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('deve renderizar fallback em caso de erro', () => {
    const Problem = () => { throw new Error('Erro!'); };
    const { getByText } = render(
      <ErrorBoundary fallback={<span>Erro capturado</span>}>
        <Problem />
      </ErrorBoundary>
    );
    expect(getByText('Erro capturado')).toBeDefined();
  });
});
