import { Pool } from 'pg';
import Redis from 'ioredis';
import { OficinaService } from '../oficina.service';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockPool, createMockRedis, MockPool, MockRedis } from '../../utils/testUtils';
import { Oficina, QueryResult, Participante } from '../../types/oficina';

jest.mock('pg');
jest.mock('ioredis');

describe('OficinaService', () => {
  let oficinaService: OficinaService;
  let mockPool: MockPool;
  let mockRedis: MockRedis;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      mockRedis.get.mockResolvedValue(JSON.stringify(mockCachedData));

      const result = await oficinaService.listarOficinas(mockFilters);

      expect(result).toEqual(mockCachedData);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar oficinas do banco quando não há cache', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockOficina, total_count: '1' }]
      });

      const result = await oficinaService.listarOficinas(mockFilters);

      expect(result.data).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('deve aplicar filtros corretamente', async () => {
      const filters = {
        ...mockFilters,
        projeto_id: 1,
        status: 'ativa' as const
      };

      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockOficina, total_count: '1' }]
      });

      const result = await oficinaService.listarOficinas(filters);

      expect(result.data).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([filters.projeto_id, filters.status])
      );
    });
  });

  describe('buscarOficina', () => {
    it('deve retornar oficina do cache quando disponível', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockOficina));

      const result = await oficinaService.buscarOficina(1);

      expect(result).toEqual(mockOficina);
      expect(mockRedis.get).toHaveBeenCalledWith('oficinas:detail:1');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar oficina do banco quando não há cache', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [mockOficina] });

      const result = await oficinaService.buscarOficina(1);

      expect(result).toEqual(mockOficina);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('deve lançar erro quando oficina não é encontrada', async () => {
      mockRedis.get.mockResolvedValue(null);
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
      expect(mockRedis.del).toHaveBeenCalled();
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

    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ responsavel_id: '123' }] 
      });
    });

    it('deve atualizar oficina quando usuário é responsável', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockOficina] });

      const result = await oficinaService.atualizarOficina(1, mockUpdateData, '123', 'gestor');

      expect(result).toEqual(mockOficina);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('deve atualizar oficina quando usuário é admin', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockOficina] });

      const result = await oficinaService.atualizarOficina(1, mockUpdateData, '456', 'admin');

      expect(result).toEqual(mockOficina);
    });

    it('deve rejeitar atualização quando usuário não tem permissão', async () => {
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

      expect(mockRedis.del).toHaveBeenCalled();
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
    const mockParticipantes = [
      { 
        id: 1, 
        nome_completo: 'Participante 1',
        data_inscricao: new Date()
      }
    ];

    it('deve retornar participantes do cache quando disponível', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockParticipantes));

      const result = await oficinaService.listarParticipantes(1);

      expect(result).toEqual(mockParticipantes);
      expect(mockRedis.get).toHaveBeenCalledWith('oficinas:participantes:1');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar participantes do banco quando não há cache', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ projeto_id: 1 }] })
        .mockResolvedValueOnce({ rows: mockParticipantes });

      const result = await oficinaService.listarParticipantes(1);

      expect(result).toEqual(mockParticipantes);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('deve lançar erro quando oficina não é encontrada', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(oficinaService.listarParticipantes(999))
        .rejects.toThrow('Oficina não encontrada');
    });
  });
});
