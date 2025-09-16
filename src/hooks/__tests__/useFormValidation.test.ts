import { renderHook, act } from '@testing-library/react';
import useFormValidation from '../useFormValidation';

describe('useFormValidation', () => {
  it('deve validar campos obrigatórios', () => {
    const { result } = renderHook(() => useFormValidation({ nome: '', email: '' }, {
      nome: { required: true },
      email: { required: true }
    }));
    act(() => {
      result.current.validate();
    });
    expect(result.current.errors.nome).toBe('Campo obrigatório');
    expect(result.current.errors.email).toBe('Campo obrigatório');
  });

  it('deve aceitar campos válidos', () => {
    const { result } = renderHook(() => useFormValidation({ nome: 'Bruno', email: 'a@b.com' }, {
      nome: { required: true },
      email: { required: true }
    }));
    act(() => {
      result.current.validate();
    });
    expect(result.current.errors.nome).toBeUndefined();
    expect(result.current.errors.email).toBeUndefined();
  });
});
