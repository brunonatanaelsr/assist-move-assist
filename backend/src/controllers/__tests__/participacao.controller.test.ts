import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../controllers/participacao.controller';
import { ParticipacaoService } from '../services/participacao.service';

// Mock do ParticipacaoService
jest.mock('../services/participacao.service');

describe('ParticipacaoController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockParticipacaoService: any;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      params: {}
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    mockParticipacaoService = ParticipacaoService as jest.MockedClass<typeof ParticipacaoService>;
    mockParticipacaoService.prototype.listarParticipacoes = jest.fn();
    mockParticipacaoService.prototype.criarParticipacao = jest.fn();
    mockParticipacaoService.prototype.atualizarParticipacao = jest.fn();
    mockParticipacaoService.prototype.excluirParticipacao = jest.fn();
    mockParticipacaoService.prototype.registrarPresenca = jest.fn();
    mockParticipacaoService.prototype.emitirCertificado = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarParticipacoes', () => {
    it('deve listar participações com sucesso', async () => {
      const mockResult = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      mockParticipacaoService.prototype.listarParticipacoes.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarParticipacoes(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(mockParticipacaoService.prototype.listarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('deve tratar erro ao listar participações', async () => {
      mockParticipacaoService.prototype.listarParticipacoes.mockRejectedValue(new Error());

      await listarParticipacoes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro interno ao buscar participações' 
      });
    });
  });

  describe('criarParticipacao', () => {
    it('deve criar participação com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        beneficiaria_id: 1,
        projeto_id: 1
      };
      mockParticipacaoService.prototype.criarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.body = {
        beneficiaria_id: 1,
        projeto_id: 1
      };

      await criarParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de beneficiária não encontrada', async () => {
      mockParticipacaoService.prototype.criarParticipacao.mockRejectedValue(
        new Error('Beneficiária não encontrada')
      );

      await criarParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Beneficiária não encontrada' 
      });
    });
  });

  describe('atualizarParticipacao', () => {
    it('deve atualizar participação com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        status: 'em_andamento'
      };
      mockParticipacaoService.prototype.atualizarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };

      await atualizarParticipacao(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de participação não encontrada', async () => {
      mockParticipacaoService.prototype.atualizarParticipacao.mockRejectedValue(
        new Error('Participação não encontrada')
      );

      mockReq.params = { id: '999' };

      await atualizarParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Participação não encontrada' 
      });
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      mockParticipacaoService.prototype.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      mockParticipacaoService.prototype.excluirParticipacao.mockRejectedValue(
        new Error('Participação não encontrada')
      );

      mockReq.params = { id: '999' };

      await excluirParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Participação não encontrada' 
      });
    });
  });

  describe('registrarPresenca', () => {
    it('deve registrar presença com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        presenca_percentual: 80
      };
      mockParticipacaoService.prototype.registrarPresenca.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 80 };

      await registrarPresenca(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve validar presença obrigatória', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await registrarPresenca(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Percentual de presença é obrigatório' 
      });
    });

    it('deve validar presença entre 0 e 100', async () => {
      mockParticipacaoService.prototype.registrarPresenca.mockRejectedValue(
        new Error('Percentual de presença deve estar entre 0 e 100')
      );

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 101 };

      await registrarPresenca(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Percentual de presença deve estar entre 0 e 100' 
      });
    });
  });

  describe('emitirCertificado', () => {
    it('deve emitir certificado com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        certificado_emitido: true,
        status: 'concluida'
      };
      mockParticipacaoService.prototype.emitirCertificado.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve validar presença mínima', async () => {
      mockParticipacaoService.prototype.emitirCertificado.mockRejectedValue(
        new Error('Presença mínima de 75% é necessária para emitir certificado')
      );

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Presença mínima de 75% é necessária para emitir certificado' 
      });
    });
  });
});
