import { renderHook, act } from '@testing-library/react';
import useAutosave from '../useAutosave';

describe('useAutosave', () => {
  it('deve salvar e restaurar valor', () => {
    const { result } = renderHook(() => useAutosave('autosave-key', 'valor-inicial'));
    act(() => {
      result.current.save('novo-valor');
    });
    expect(result.current.value).toBe('novo-valor');
    act(() => {
      result.current.restore((v: string) => {
        expect(v).toBe('novo-valor');
      });
    });
  });

  it('deve limpar valor salvo', () => {
    const { result } = renderHook(() => useAutosave('autosave-key', 'valor-inicial'));
    act(() => {
      result.current.save('teste');
      result.current.clear();
    });
    expect(result.current.value).toBe('valor-inicial');
  });
});
