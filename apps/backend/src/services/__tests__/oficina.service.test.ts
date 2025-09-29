import { Pool } from 'pg';
import Redis from 'ioredis';
import { OficinaService } from '../oficina.service';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockPool, createMockRedis, MockPool, MockRedis } from '../../utils/testUtils';
import { Oficina, Participante } from '../../types/oficina';
import { cacheService } from '../cache.service';

jest.mock('pg');
jest.mock('ioredis');

describe('OficinaService', () => {
  let oficinaService: OficinaService;
  let mockPool: MockPool;
  let mockRedis: MockRedis;
  let cacheGetSpy: any;
  let getColumnMapSpy: any;

  const mockOficina: Oficina = {
    id: 1,
    nome: 'Oficina Teste',
    descricao: 'Descrição da oficina teste',
    instrutor: 'Instrutor Teste',
    data_inicio: '2025-08-20',
    data_fim: '2025-08-21',
    horario_inicio: '09:00',
    horario_fim: '17:00',
    local: 'Local Teste',
    vagas_total: 20,
    projeto_id: 1,
    responsavel_id: '123',
    status: 'ativa',
    ativo: true,
    data_criacao: '2025-08-26',
    data_atualizacao: '2025-08-26'
  };

  beforeEach(() => {
    mockPool = createMockPool();
    mockRedis = createMockRedis();
    oficinaService = new OficinaService(mockPool as unknown as Pool, mockRedis as unknown as Redis);

    getColumnMapSpy = jest
      .spyOn(oficinaService as any, 'getColumnMap')
      .mockResolvedValue({
        nome: 'nome',
        descricao: 'descricao',
        instrutor: 'instrutor',
        data_inicio: 'data_inicio',
        data_fim: 'data_fim',
        horario_inicio: 'horario_inicio',
        horario_fim: 'horario_fim',
        local: 'local',
        vagas_total: 'vagas_total',
        projeto_id: 'projeto_id',
        responsavel_id: 'responsavel_id',
        status: 'status',
        ativo: 'ativo',
        data_criacao: 'data_criacao',
        data_atualizacao: 'data_atualizacao'
      });

    cacheGetSpy = jest.spyOn(cacheService, 'get').mockResolvedValue(null);
    jest.spyOn(cacheService, 'set').mockResolvedValue();
    jest.spyOn(cacheService, 'deletePattern').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listarOficinas', () => {
    const mockFilters = {
      page: 1,
      limit: 10
    };

    it('deve retornar oficinas do cache quando disponível', async () => {
      const mockCachedData = {
        data: [mockOficina],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
      };

      cacheGetSpy.mockResolvedValueOnce(mockCachedData);

      const result: any = await oficinaService.listarOficinas(mockFilters);

      expect(result).toEqual(mockCachedData);
      expect(cacheService.get).toHaveBeenCalledWith('oficinas:list:all:all:10');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar oficinas do banco quando não há cache', async () => {
      const dbRow = {
        ...mockOficina,
        data_inicio: new Date('2025-08-20T00:00:00Z'),
        data_fim: new Date('2025-08-21T00:00:00Z'),
        data_criacao: new Date('2025-08-26T00:00:00Z'),
        data_atualizacao: new Date('2025-08-26T00:00:00Z'),
        total_count: '1'
      };

      mockPool.query.mockResolvedValue({
        rows: [dbRow]
      });

      const result: any = await oficinaService.listarOficinas(mockFilters);

      expect(result.data).toHaveLength(1);
      expect(result).toEqual({
        data: [
          {
            ...dbRow,
            data_inicio: '2025-08-20',
            data_fim: '2025-08-21',
            data_criacao: '2025-08-26',
            data_atualizacao: '2025-08-26'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
      expect(mockPool.query).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'oficinas:list:all:all:10',
        {
          data: [
            {
              ...dbRow,
              data_inicio: '2025-08-20',
              data_fim: '2025-08-21',
              data_criacao: '2025-08-26',
              data_atualizacao: '2025-08-26'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        },
        300
      );
    });

    it('deve aplicar filtros corretamente', async () => {
      const filters = {
        ...mockFilters,
        projeto_id: 1,
        status: 'ativa' as const
      };

      mockPool.query.mockResolvedValue({
        rows: [{ ...mockOficina, total_count: '1' }]
      });

      const result: any = await oficinaService.listarOficinas(filters);

      expect(result.data).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([filters.projeto_id, filters.status])
      );
    });
  });

  describe('buscarOficina', () => {
    it('deve retornar oficina do cache quando disponível', async () => {
      cacheGetSpy.mockResolvedValueOnce(mockOficina);

      const result = await oficinaService.buscarOficina(1);

      expect(result).toEqual(mockOficina);
      expect(cacheService.get).toHaveBeenCalledWith('oficinas:detail:1');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar oficina do banco quando não há cache', async () => {
      const dbRow = {
        ...mockOficina,
        data_inicio: new Date('2025-08-20T00:00:00Z'),
        data_fim: new Date('2025-08-21T00:00:00Z'),
        data_criacao: new Date('2025-08-26T00:00:00Z'),
        data_atualizacao: new Date('2025-08-26T00:00:00Z')
      };

      mockPool.query.mockResolvedValue({ rows: [dbRow] });

      const result = await oficinaService.buscarOficina(1);

      expect(result).toEqual({
        ...dbRow,
        data_inicio: '2025-08-20',
        data_fim: '2025-08-21',
        data_criacao: '2025-08-26',
        data_atualizacao: '2025-08-26'
      });
      expect(mockPool.query).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'oficinas:detail:1',
        {
          ...dbRow,
          data_inicio: '2025-08-20',
          data_fim: '2025-08-21',
          data_criacao: '2025-08-26',
          data_atualizacao: '2025-08-26'
        },
        300
      );
    });

    it('deve lançar erro quando oficina não é encontrada', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(oficinaService.buscarOficina(999))
        .rejects.toThrow('Oficina não encontrada');
    });
  });

  describe('criarOficina', () => {
    const mockCreateData = {
      nome: 'Nova Oficina',
      data_inicio: new Date('2025-08-20'),
      horario_inicio: '09:00',
      horario_fim: '17:00',
      vagas_total: 20
    };

    it('deve criar oficina com sucesso', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // verificação do projeto
        .mockResolvedValueOnce({ rows: [mockOficina] }); // criação da oficina

      const result = await oficinaService.criarOficina(mockCreateData, '123');

      expect(result).toEqual(mockOficina);
      expect(cacheService.deletePattern).toHaveBeenCalledWith('oficinas:list:*');
    });

    it('deve validar dados antes de criar', async () => {
      const invalidData = {
        ...mockCreateData,
        nome: '' // nome inválido
      };

      await expect(oficinaService.criarOficina(invalidData, '123'))
        .rejects.toThrow();
    });
  });

  describe('atualizarOficina', () => {
    const mockUpdateData = {
      nome: 'Oficina Atualizada',
      descricao: 'Nova descrição'
    };

    it('deve atualizar oficina quando usuário é responsável', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ responsavel_id: '123' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockOficina] });

      const result = await oficinaService.atualizarOficina(1, mockUpdateData, '123', 'gestor');

      expect(result).toEqual(mockOficina);
      expect(cacheService.deletePattern).toHaveBeenCalledWith('oficinas:list:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('oficinas:detail:1');
    });

    it('deve atualizar oficina quando usuário é admin', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ responsavel_id: '123' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockOficina] });

      const result = await oficinaService.atualizarOficina(1, mockUpdateData, '456', 'admin');

      expect(result).toEqual(mockOficina);
    });

    it('deve rejeitar atualização quando usuário não tem permissão', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ responsavel_id: '123' }] });
      await expect(
        oficinaService.atualizarOficina(1, mockUpdateData, '456', 'gestor')
      ).rejects.toThrow('Sem permissão para editar esta oficina');
    });
  });

  describe('excluirOficina', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ responsavel_id: '123', nome: 'Oficina Teste' }] 
      });
    });

    it('deve excluir oficina quando usuário é responsável', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await expect(
        oficinaService.excluirOficina(1, '123', 'gestor')
      ).resolves.not.toThrow();

      expect(cacheService.deletePattern).toHaveBeenCalledWith('oficinas:list:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('oficinas:detail:1');
    });

    it('deve excluir oficina quando usuário é admin', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await expect(
        oficinaService.excluirOficina(1, '456', 'admin')
      ).resolves.not.toThrow();
    });

    it('deve rejeitar exclusão quando usuário não tem permissão', async () => {
      await expect(
        oficinaService.excluirOficina(1, '456', 'gestor')
      ).rejects.toThrow('Sem permissão para excluir esta oficina');
    });
  });

  describe('listarParticipantes', () => {
    const mockParticipantesCache = [
      {
        id: 1,
        nome_completo: 'Participante 1',
        data_inscricao: '2025-09-29'
      }
    ];

    const mockParticipantesDb = [
      {
        id: 1,
        nome_completo: 'Participante 1',
        data_inscricao: new Date('2025-09-29T15:00:31.571Z')
      }
    ];

    it('deve retornar participantes do cache quando disponível', async () => {
      cacheGetSpy.mockResolvedValueOnce(mockParticipantesCache);

      const result = await oficinaService.listarParticipantes(1);

      expect(result).toEqual(mockParticipantesCache);
      expect(cacheService.get).toHaveBeenCalledWith('oficinas:participantes:1');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar participantes do banco quando não há cache', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ projeto_id: 1 }] })
        .mockResolvedValueOnce({ rows: mockParticipantesDb });

      const result = await oficinaService.listarParticipantes(1);

      expect(result).toEqual(mockParticipantesCache);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledWith('oficinas:participantes:1', mockParticipantesCache, 300);
    });

    it('deve lançar erro quando oficina não é encontrada', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(oficinaService.listarParticipantes(999))
        .rejects.toThrow('Oficina não encontrada');
    });
  });
});
