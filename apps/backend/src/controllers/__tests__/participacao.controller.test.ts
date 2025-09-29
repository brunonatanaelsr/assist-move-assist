import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../participacao.controller';
import { ParticipacaoService } from '../../services/participacao.service';
import { AppError, ValidationError } from '../../utils';

// Mock do ParticipacaoService
jest.mock('../../services/participacao.service');

describe('ParticipacaoController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockParticipacaoService: any;
  let next: jest.Mock;

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
    next = jest.fn();
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

      await listarParticipacoes(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(mockParticipacaoService.prototype.listarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro ao listar participações', async () => {
      mockParticipacaoService.prototype.listarParticipacoes.mockRejectedValue(new Error());

      await listarParticipacoes(mockReq, mockRes, next);

      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Erro interno ao buscar participações');
      expect((errorArg as AppError).statusCode).toBe(500);
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

      await criarParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de beneficiária não encontrada', async () => {
      const error = new Error('Beneficiária não encontrada');
      mockParticipacaoService.prototype.criarParticipacao.mockRejectedValue(error);

      await criarParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
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

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const error = new Error('Participação não encontrada');
      mockParticipacaoService.prototype.atualizarParticipacao.mockRejectedValue(error);

      mockReq.params = { id: '999' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      mockParticipacaoService.prototype.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const error = new Error('Participação não encontrada');
      mockParticipacaoService.prototype.excluirParticipacao.mockRejectedValue(error);

      mockReq.params = { id: '999' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
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

      await registrarPresenca(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença obrigatória', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await registrarPresenca(mockReq, mockRes, next);

      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(ValidationError);
      expect(errorArg.message).toBe('Percentual de presença é obrigatório');
    });

    it('deve validar presença entre 0 e 100', async () => {
      const error = new Error('Percentual de presença deve estar entre 0 e 100');
      mockParticipacaoService.prototype.registrarPresenca.mockRejectedValue(error);

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 101 };

      await registrarPresenca(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
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

      await emitirCertificado(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença mínima', async () => {
      const error = new Error('Presença mínima de 75% é necessária para emitir certificado');
      mockParticipacaoService.prototype.emitirCertificado.mockRejectedValue(error);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
