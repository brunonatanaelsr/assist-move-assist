import {
  listarProjetos,
  buscarProjeto,
  criarProjeto,
  atualizarProjeto,
  excluirProjeto
} from '../projeto.controller';
import { ProjetoService } from '../../services/projeto.service';

// Mock do ProjetoService
jest.mock('../../services/projeto.service');

describe('ProjetoController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockProjetoService: any;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      params: {},
      user: {
        id: 1,
        email: 'teste@teste.com'
      }
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    mockProjetoService = ProjetoService as jest.MockedClass<typeof ProjetoService>;
    mockProjetoService.prototype.listarProjetos = jest.fn();
    mockProjetoService.prototype.buscarProjeto = jest.fn();
    mockProjetoService.prototype.criarProjeto = jest.fn();
    mockProjetoService.prototype.atualizarProjeto = jest.fn();
    mockProjetoService.prototype.excluirProjeto = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarProjetos', () => {
    it('deve listar projetos com sucesso', async () => {
      const mockResult = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      mockProjetoService.prototype.listarProjetos.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarProjetos(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        message: "Projetos carregados com sucesso",
        pagination: mockResult.pagination
      });
    });

    it('deve tratar erro ao listar projetos', async () => {
      mockProjetoService.prototype.listarProjetos.mockRejectedValue(new Error());

      await listarProjetos(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno ao buscar projetos'
      });
    });
  });

  describe('buscarProjeto', () => {
    it('deve buscar projeto com sucesso', async () => {
      const mockProjeto = { id: 1, nome: 'Projeto Teste' };
      mockProjetoService.prototype.buscarProjeto.mockResolvedValue(mockProjeto);

      mockReq.params = { id: '1' };

      await buscarProjeto(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProjeto,
        message: "Projeto carregado com sucesso"
      });
    });

    it('deve tratar erro de projeto não encontrado', async () => {
      mockProjetoService.prototype.buscarProjeto.mockRejectedValue(
        new Error('Projeto não encontrado')
      );

      mockReq.params = { id: '999' };

      await buscarProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Projeto não encontrado'
      });
    });
  });

  describe('criarProjeto', () => {
    it('deve criar projeto com sucesso', async () => {
      const mockProjeto = {
        id: 1,
        nome: 'Novo Projeto',
        responsavel_id: 1
      };
      mockProjetoService.prototype.criarProjeto.mockResolvedValue(mockProjeto);

      mockReq.body = {
        nome: 'Novo Projeto'
      };

      await criarProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProjeto,
        message: "Projeto criado com sucesso"
      });
    });

    it('deve validar usuário autenticado', async () => {
      mockReq.user = undefined;

      await criarProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Usuário não autenticado'
      });
    });

    it('deve tratar erro de validação', async () => {
      const zodError = {
        name: 'ZodError',
        errors: ['Campo inválido']
      };
      mockProjetoService.prototype.criarProjeto.mockRejectedValue(zodError);

      await criarProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Dados inválidos',
        details: zodError.errors
      });
    });
  });

  describe('atualizarProjeto', () => {
    it('deve atualizar projeto com sucesso', async () => {
      const mockProjeto = {
        id: 1,
        nome: 'Projeto Atualizado'
      };
      mockProjetoService.prototype.atualizarProjeto.mockResolvedValue(mockProjeto);

      mockReq.params = { id: '1' };
      mockReq.body = { nome: 'Projeto Atualizado' };

      await atualizarProjeto(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProjeto,
        message: "Projeto atualizado com sucesso"
      });
    });

    it('deve tratar erro de projeto não encontrado', async () => {
      mockProjetoService.prototype.atualizarProjeto.mockRejectedValue(
        new Error('Projeto não encontrado')
      );

      mockReq.params = { id: '999' };

      await atualizarProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Projeto não encontrado'
      });
    });
  });

  describe('excluirProjeto', () => {
    it('deve excluir projeto com sucesso', async () => {
      mockProjetoService.prototype.excluirProjeto.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirProjeto(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Projeto removido com sucesso"
      });
    });

    it('deve tratar erro ao excluir projeto com oficinas', async () => {
      mockProjetoService.prototype.excluirProjeto.mockRejectedValue(
        new Error('Não é possível excluir projeto com oficinas ativas')
      );

      mockReq.params = { id: '1' };

      await excluirProjeto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não é possível excluir projeto com oficinas ativas'
      });
    });
  });
});
