import { ProjetoService } from '../projeto.service';
import { Pool } from 'pg';
import Redis from 'ioredis';

describe('ProjetoService', () => {
  let projetoService: ProjetoService;
  let mockPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn()
    } as any;

    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      keys: jest.fn(),
      del: jest.fn()
    } as any;

    projetoService = new ProjetoService(mockPool, mockRedis);
  });

  describe('listarProjetos', () => {
    it('deve listar projetos com filtros', async () => {
      // Mock do cache vazio
      mockRedis.get.mockResolvedValue(null);

      // Mock da query principal
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            nome: 'Projeto Teste',
            responsavel_nome: 'João',
            total_oficinas: 2,
            total_count: '1'
          }
        ]
      });

      const result = await projetoService.listarProjetos({
        page: '1',
        limit: '10'
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('deve retornar dados do cache quando disponível', async () => {
      const cachedData = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await projetoService.listarProjetos({
        page: '1',
        limit: '10'
      });

      expect(result).toEqual(cachedData);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('buscarProjeto', () => {
    it('deve buscar um projeto por ID', async () => {
      // Mock do cache vazio
      mockRedis.get.mockResolvedValue(null);

      const mockProjeto = {
        id: 1,
        nome: 'Projeto Teste',
        responsavel_nome: 'João'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockProjeto]
      });

      const result = await projetoService.buscarProjeto(1);

      expect(result).toEqual(mockProjeto);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('deve lançar erro se projeto não existir', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(projetoService.buscarProjeto(999))
        .rejects.toThrow('Projeto não encontrado');
    });
  });

  describe('criarProjeto', () => {
    it('deve criar um novo projeto', async () => {
      const mockProjeto = {
        id: 1,
        nome: 'Novo Projeto',
        data_inicio: new Date(),
        responsavel_id: 1
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockProjeto]
      });

      const result = await projetoService.criarProjeto({
        nome: 'Novo Projeto',
        data_inicio: new Date(),
        responsavel_id: 1
      });

      expect(result).toEqual(mockProjeto);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.keys).toHaveBeenCalled(); // Verifica invalidação do cache
    });
  });

  describe('atualizarProjeto', () => {
    it('deve atualizar um projeto existente', async () => {
      // Mock verificação de existência
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock atualização
      const mockProjetoAtualizado = {
        id: 1,
        nome: 'Projeto Atualizado'
      };
      mockPool.query.mockResolvedValueOnce({
        rows: [mockProjetoAtualizado]
      });

      const result = await projetoService.atualizarProjeto(1, {
        nome: 'Projeto Atualizado'
      });

      expect(result).toEqual(mockProjetoAtualizado);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockRedis.keys).toHaveBeenCalled(); // Verifica invalidação do cache
    });

    it('deve lançar erro se projeto não existir', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(projetoService.atualizarProjeto(999, {
        nome: 'Teste'
      })).rejects.toThrow('Projeto não encontrado');
    });
  });

  describe('excluirProjeto', () => {
    it('deve excluir um projeto sem oficinas', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, total_oficinas: 0 }]
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      await projetoService.excluirProjeto(1);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockRedis.keys).toHaveBeenCalled(); // Verifica invalidação do cache
    });

    it('não deve excluir projeto com oficinas ativas', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, total_oficinas: 2 }]
      });

      await expect(projetoService.excluirProjeto(1))
        .rejects.toThrow('Não é possível excluir projeto com oficinas ativas');
    });
  });
});
