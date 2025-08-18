const beneficiariaService = require('../services/beneficiaria.service');
const { db } = require('../services/db');
const { AppError } = require('../middleware/errorHandler');

// Mock do banco de dados
jest.mock('../services/db');
const mockDb = db;

describe('BeneficiariaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar()', () => {
    it('deve listar beneficiárias com paginação', async () => {
      const mockBeneficiarias = [
        { id: 1, nome_completo: 'Test 1' },
        { id: 2, nome_completo: 'Test 2' }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockBeneficiarias)
        .mockResolvedValueOnce([{ total: '2' }]);

      const result = await beneficiariaService.listar({
        page: 1,
        limit: 10
      });

      expect(result.beneficiarias).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      await beneficiariaService.listar({
        search: 'maria',
        status: 'ativa',
        page: 1,
        limit: 10
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('nome_completo ILIKE $1'),
        expect.arrayContaining(['%maria%', 'ativa', 10, 0])
      );
    });
  });

  describe('criar()', () => {
    const dadosValidos = {
      nome_completo: 'Maria Silva',
      cpf: '123.456.789-01',
      data_nascimento: '1990-01-01'
    };

    it('deve criar beneficiária com dados válidos', async () => {
      mockDb.query.mockResolvedValueOnce([]); // CPF não existe
      mockDb.insert.mockResolvedValueOnce({
        id: 1,
        ...dadosValidos
      });

      const result = await beneficiariaService.criar(dadosValidos, 1);

      expect(result).toHaveProperty('id');
      expect(result.nome_completo).toBe(dadosValidos.nome_completo);
    });

    it('deve rejeitar CPF inválido', async () => {
      await expect(
        beneficiariaService.criar({
          ...dadosValidos,
          cpf: '123.456.789-00'
        }, 1)
      ).rejects.toThrow('CPF inválido');
    });

    it('deve rejeitar CPF duplicado', async () => {
      mockDb.query.mockResolvedValueOnce([{ id: 2 }]); // CPF existe

      await expect(
        beneficiariaService.criar(dadosValidos, 1)
      ).rejects.toThrow('CPF já cadastrado');
    });

    it('deve rejeitar nome muito curto', async () => {
      await expect(
        beneficiariaService.criar({
          ...dadosValidos,
          nome_completo: 'Ab'
        }, 1)
      ).rejects.toThrow('Nome completo deve ter no mínimo 3 caracteres');
    });
  });

  describe('atualizar()', () => {
    const id = 1;
    const dadosAtualizacao = {
      nome_completo: 'Maria Silva Atualizado',
      telefone: '11999887766'
    };

    it('deve atualizar beneficiária existente', async () => {
      mockDb.findById.mockResolvedValueOnce({
        id,
        nome_completo: 'Maria Silva',
        cpf: '123.456.789-01'
      });

      mockDb.update.mockResolvedValueOnce({
        id,
        ...dadosAtualizacao
      });

      const result = await beneficiariaService.atualizar(id, dadosAtualizacao, 1);

      expect(result.nome_completo).toBe(dadosAtualizacao.nome_completo);
      expect(result.telefone).toBe(dadosAtualizacao.telefone);
    });

    it('deve rejeitar beneficiária inexistente', async () => {
      mockDb.findById.mockResolvedValueOnce(null);

      await expect(
        beneficiariaService.atualizar(999, dadosAtualizacao, 1)
      ).rejects.toThrow('Beneficiária não encontrada');
    });
  });

  describe('buscarHistoricoCompleto()', () => {
    const id = 1;

    it('deve retornar histórico completo', async () => {
      mockDb.findById.mockResolvedValueOnce({
        id,
        nome_completo: 'Maria Silva'
      });

      mockDb.query
        .mockResolvedValueOnce([{ id: 1, tipo: 'social' }]) // anamneses
        .mockResolvedValueOnce([{ id: 1, data: '2025-01-01' }]) // declarações
        .mockResolvedValueOnce([{ id: 1, tipo: 'psicológico' }]) // atendimentos
        .mockResolvedValueOnce([{ id: 1, titulo: 'Oficina 1' }]); // oficinas

      const result = await beneficiariaService.buscarHistoricoCompleto(id);

      expect(result).toHaveProperty('beneficiaria');
      expect(result).toHaveProperty('anamneses');
      expect(result).toHaveProperty('declaracoes');
      expect(result).toHaveProperty('atendimentos');
      expect(result).toHaveProperty('oficinas');
    });

    it('deve rejeitar ID inválido', async () => {
      mockDb.findById.mockResolvedValueOnce(null);

      await expect(
        beneficiariaService.buscarHistoricoCompleto(999)
      ).rejects.toThrow('Beneficiária não encontrada');
    });
  });
});
