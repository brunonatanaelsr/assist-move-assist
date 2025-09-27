import { BeneficiariasService } from '../beneficiarias.service';
import { cacheService } from '../cache.service';
import { AppError } from '../../utils';

jest.mock('../cache.service', () => {
  const store = new Map<string, any>();
  return {
    cacheService: {
      get: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
      set: jest.fn(async (key: string, value: any) => {
        store.set(key, value);
      }),
      deletePattern: jest.fn(async () => {
        // noop
      }),
      __store: store,
      __reset: () => store.clear()
    }
  };
});

const mockedCache = cacheService as unknown as typeof cacheService & { __reset: () => void };

describe('BeneficiariasService', () => {
  const baseResumo = {
    beneficiaria: {
      id: 1,
      nome_completo: 'Maria',
      status: 'ativa',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-02T00:00:00Z')
    },
    formularios: {
      total: 3,
      anamnese: 1,
      ficha_evolucao: 1,
      termos: 0,
      visao_holistica: 1,
      genericos: 0
    },
    atendimentos: {
      total: 2,
      ultimo_atendimento: new Date('2024-01-03T00:00:00Z')
    },
    participacoes: {
      total_ativas: 1
    }
  };

  let repository: any;
  let service: BeneficiariasService;

  beforeEach(() => {
    mockedCache.__reset();
    repository = {
      buscarPorTexto: jest.fn(),
      listarAtivas: jest.fn().mockResolvedValue({ data: [], total: 0, pages: 0 }),
      findWithRelations: jest.fn(),
      getResumo: jest.fn().mockResolvedValue(baseResumo),
      getAtividades: jest.fn().mockResolvedValue({
        data: [
          {
            type: 'formulario',
            id: 10,
            created_at: new Date('2024-01-04T00:00:00Z'),
            created_by: 1,
            created_by_name: null
          }
        ],
        pagination: { page: 1, limit: 20, total: 1 }
      }),
      findByCPF: jest.fn().mockResolvedValue(null),
      createWithRelations: jest.fn().mockResolvedValue({ id: 99 }),
      findById: jest.fn().mockResolvedValue({ id: 99, cpf: '12345678900' }),
      updateWithRelations: jest.fn().mockResolvedValue({ id: 99 }),
      softDelete: jest.fn().mockResolvedValue(undefined),
      buscarPorId: jest.fn().mockResolvedValue({ id: 1 })
    };
    service = new BeneficiariasService({} as any, undefined, repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve buscar resumo e armazenar em cache', async () => {
    const resumo1 = await service.getResumo(1);
    const resumo2 = await service.getResumo(1);

    expect(resumo1).toEqual(baseResumo);
    expect(resumo2).toEqual(baseResumo);
    expect(repository.getResumo).toHaveBeenCalledTimes(1);
  });

  it('deve retornar atividades paginadas com cache', async () => {
    const atividades = await service.getAtividades(1, 1, 20);

    expect(atividades.pagination.total).toBe(1);
    expect(repository.getAtividades).toHaveBeenCalledWith(1, 1, 20);
  });

  it('deve invalidar cache ao criar beneficiária', async () => {
    await service.createBeneficiaria({ nome_completo: 'Teste' } as any, { skipValidation: true });

    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:list:*');
    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:99:*');
  });

  it('deve invalidar cache ao atualizar beneficiária', async () => {
    await service.updateBeneficiaria(99, { nome_completo: 'Atualizada' } as any, { skipValidation: true });

    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:list:*');
    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:99:*');
  });

  it('deve invalidar cache ao excluir beneficiária', async () => {
    await service.deleteBeneficiaria(5);

    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:list:*');
    expect(cacheService.deletePattern).toHaveBeenCalledWith('beneficiarias:5:*');
  });

  it('deve lançar AppError quando resumo não encontrado', async () => {
    repository.getResumo.mockResolvedValueOnce(null);

    await expect(service.getResumo(999)).rejects.toBeInstanceOf(AppError);
  });
});
