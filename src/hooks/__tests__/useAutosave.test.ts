import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import useAutosave from '../useAutosave';

describe('useAutosave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve salvar e restaurar valor', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => {
      const [value, setValue] = useState('valor-inicial');
      const autosave = useAutosave({ key: 'autosave-key', data: value, debounceMs: 0 });
      return { value, setValue, ...autosave };
    });

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.setValue('novo-valor');
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(JSON.parse(localStorage.getItem('autosave-key')!)).toBe('novo-valor');

    act(() => {
      const restored = result.current.restore(result.current.setValue);
      expect(restored).toBe(true);
    });

    expect(result.current.value).toBe('novo-valor');
    expect(result.current.hasDraft).toBe(false);
    expect(result.current.restored).toBe(true);
  });

  it('deve limpar valor salvo', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => {
      const [value, setValue] = useState('valor-inicial');
      const autosave = useAutosave({ key: 'autosave-key', data: value, debounceMs: 0 });
      return { value, setValue, ...autosave };
    });

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.setValue('teste');
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(localStorage.getItem('autosave-key')).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(localStorage.getItem('autosave-key')).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });
});
