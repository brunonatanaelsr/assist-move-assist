import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../participacao.controller';
import { AppError, ValidationError } from '../../utils';

type ServiceMocks = {
  listarParticipacoes: jest.Mock;
  criarParticipacao: jest.Mock;
  atualizarParticipacao: jest.Mock;
  excluirParticipacao: jest.Mock;
  registrarPresenca: jest.Mock;
  emitirCertificado: jest.Mock;
};

var serviceMocks: ServiceMocks;

// Mock do ParticipacaoService
jest.mock('../../services/participacao.service', () => {
  serviceMocks = {
    listarParticipacoes: jest.fn(),
    criarParticipacao: jest.fn(),
    atualizarParticipacao: jest.fn(),
    excluirParticipacao: jest.fn(),
    registrarPresenca: jest.fn(),
    emitirCertificado: jest.fn()
  };

  return {
    ParticipacaoService: jest.fn().mockImplementation(() => serviceMocks)
  };
});


describe('ParticipacaoController', () => {
  let mockReq: any;
  let mockRes: any;

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
    serviceMocks.listarParticipacoes.mockReset();
    serviceMocks.criarParticipacao.mockReset();
    serviceMocks.atualizarParticipacao.mockReset();
    serviceMocks.excluirParticipacao.mockReset();
    serviceMocks.registrarPresenca.mockReset();
    serviceMocks.emitirCertificado.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarParticipacoes', () => {
    it('deve listar participações com sucesso', async () => {
      const next = jest.fn();
      const mockResult = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      serviceMocks.listarParticipacoes.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarParticipacoes(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(serviceMocks.listarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro ao listar participações', async () => {
      const next = jest.fn();
      serviceMocks.listarParticipacoes.mockRejectedValue(new Error('Erro'));

      await listarParticipacoes(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Erro interno ao buscar participações');
      expect(error.statusCode).toBe(500);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('criarParticipacao', () => {
    it('deve criar participação com sucesso', async () => {
      const next = jest.fn();
      const mockParticipacao = {
        id: 1,
        beneficiaria_id: 1,
        projeto_id: 1
      };
      serviceMocks.criarParticipacao.mockResolvedValue(mockParticipacao);

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
      const next = jest.fn();
      serviceMocks.criarParticipacao.mockRejectedValue(
        new AppError('Beneficiária não encontrada', 404)
      );

      await criarParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Beneficiária não encontrada');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('atualizarParticipacao', () => {
    it('deve atualizar participação com sucesso', async () => {
      const next = jest.fn();
      const mockParticipacao = {
        id: 1,
        status: 'em_andamento'
      };
      serviceMocks.atualizarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const next = jest.fn();
      serviceMocks.atualizarParticipacao.mockRejectedValue(
        new AppError('Participação não encontrada', 404)
      );

      mockReq.params = { id: '999' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Participação não encontrada');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      const next = jest.fn();
      serviceMocks.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const next = jest.fn();
      serviceMocks.excluirParticipacao.mockRejectedValue(
        new AppError('Participação não encontrada', 404)
      );

      mockReq.params = { id: '999' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Participação não encontrada');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('registrarPresenca', () => {
    it('deve registrar presença com sucesso', async () => {
      const next = jest.fn();
      const mockParticipacao = {
        id: 1,
        presenca_percentual: 80
      };
      serviceMocks.registrarPresenca.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 80 };

      await registrarPresenca(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença obrigatória', async () => {
      const next = jest.fn();
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await registrarPresenca(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Percentual de presença é obrigatório');
    });

    it('deve validar presença entre 0 e 100', async () => {
      const next = jest.fn();
      serviceMocks.registrarPresenca.mockRejectedValue(
        new ValidationError('Percentual de presença deve estar entre 0 e 100')
      );

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 101 };

      await registrarPresenca(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Percentual de presença deve estar entre 0 e 100');
    });
  });

  describe('emitirCertificado', () => {
    it('deve emitir certificado com sucesso', async () => {
      const next = jest.fn();
      const mockParticipacao = {
        id: 1,
        certificado_emitido: true,
        status: 'concluida'
      };
      serviceMocks.emitirCertificado.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença mínima', async () => {
      const next = jest.fn();
      serviceMocks.emitirCertificado.mockRejectedValue(
        new ValidationError('Presença mínima de 75% é necessária para emitir certificado')
      );

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Presença mínima de 75% é necessária para emitir certificado');
    });
  });
});
