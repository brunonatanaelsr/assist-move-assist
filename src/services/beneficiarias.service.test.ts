import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeneficiariasService } from './beneficiarias.service';
import { api } from '@/services/api';
import type { Beneficiaria } from '@/types/shared';

describe('BeneficiariasService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listar deve delegar ao api.get e retornar os dados', async () => {
    const payload = [{ id: 1, nome_completo: 'Teste' } as Beneficiaria];
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: payload } as any);

    const result = await BeneficiariasService.listar({ page: 1 });

    expect(getSpy).toHaveBeenCalledWith('/beneficiarias', { params: { page: 1 } });
    expect(result).toEqual(payload);
  });

  it('criar deve normalizar dados sensíveis antes de enviar', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 2 } } as any);

    const result = await BeneficiariasService.criar({
      nome_completo: 'Nova',
      cpf: '123.456.789-00',
      telefone: '(11) 99999-8888',
      status: 'ATIVA' as unknown as Beneficiaria['status'],
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/beneficiarias',
      expect.objectContaining({
        nome_completo: 'Nova',
        cpf: '12345678900',
        telefone: '11999998888',
        status: 'ativa',
      })
    );
    expect(result).toEqual({ id: 2 });
  });
});
