import { renderHook, act } from '@testing-library/react';
import useFormValidation from '../useFormValidation';

describe('useFormValidation', () => {
  it('deve validar campos obrigatórios', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        nome: { required: true },
        email: { required: true },
      })
    );

    act(() => {
      const isValid = result.current.validateForm({ nome: '', email: '' });
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.nome).toBe('Este campo é obrigatório');
    expect(result.current.errors.email).toBe('Este campo é obrigatório');
  });

  it('deve aceitar campos válidos', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        nome: { required: true },
        email: { required: true },
      })
    );

    act(() => {
      const isValid = result.current.validateForm({ nome: 'Bruno', email: 'a@b.com' });
      expect(isValid).toBe(true);
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(true);
  });
});
