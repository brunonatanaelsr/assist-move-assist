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
  let mockParticipacaoService: jest.MockedClass<typeof ParticipacaoService>;
  let participacaoServiceInstance!: jest.Mocked<ParticipacaoService>;
  const next = jest.fn();

  beforeEach(() => {
    next.mockReset();
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
    if (!participacaoServiceInstance) {
      const instance = mockParticipacaoService.mock.instances[0];
      if (!instance) {
        throw new Error('ParticipacaoService instance was not initialized');
      }
      participacaoServiceInstance = instance as jest.Mocked<ParticipacaoService>;
    }

    participacaoServiceInstance.listarParticipacoes = jest.fn();
    participacaoServiceInstance.criarParticipacao = jest.fn();
    participacaoServiceInstance.atualizarParticipacao = jest.fn();
    participacaoServiceInstance.excluirParticipacao = jest.fn();
    participacaoServiceInstance.registrarPresenca = jest.fn();
    participacaoServiceInstance.emitirCertificado = jest.fn();
  });
  describe('listarParticipacoes', () => {
    it('deve listar participações com sucesso', async () => {
      const mockResult = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      participacaoServiceInstance.listarParticipacoes.mockResolvedValue(mockResult as any);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarParticipacoes(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(participacaoServiceInstance.listarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro ao listar participações', async () => {
      participacaoServiceInstance.listarParticipacoes.mockRejectedValue(new Error());

      await listarParticipacoes(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Erro interno ao buscar participações');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('criarParticipacao', () => {
    it('deve criar participação com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        beneficiaria_id: 1,
        projeto_id: 1
      };
      participacaoServiceInstance.criarParticipacao.mockResolvedValue(mockParticipacao as any);

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
      participacaoServiceInstance.criarParticipacao.mockRejectedValue(
        new Error('Beneficiária não encontrada')
      );

      await criarParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Beneficiária não encontrada');
    });
  });

  describe('atualizarParticipacao', () => {
    it('deve atualizar participação com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        status: 'em_andamento'
      };
      participacaoServiceInstance.atualizarParticipacao.mockResolvedValue(mockParticipacao as any);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      participacaoServiceInstance.atualizarParticipacao.mockRejectedValue(
        new Error('Participação não encontrada')
      );

      mockReq.params = { id: '999' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Participação não encontrada');
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      participacaoServiceInstance.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      participacaoServiceInstance.excluirParticipacao.mockRejectedValue(
        new Error('Participação não encontrada')
      );

      mockReq.params = { id: '999' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Participação não encontrada');
    });
  });

  describe('registrarPresenca', () => {
    it('deve registrar presença com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        presenca_percentual: 80
      };
      participacaoServiceInstance.registrarPresenca.mockResolvedValue(mockParticipacao as any);

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

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Percentual de presença é obrigatório');
    });

    it('deve validar presença entre 0 e 100', async () => {
      participacaoServiceInstance.registrarPresenca.mockRejectedValue(
        new Error('Percentual de presença deve estar entre 0 e 100')
      );

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 101 };

      await registrarPresenca(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Percentual de presença deve estar entre 0 e 100');
    });
  });

  describe('emitirCertificado', () => {
    it('deve emitir certificado com sucesso', async () => {
      const mockParticipacao = {
        id: 1,
        certificado_emitido: true,
        status: 'concluida'
      };
      participacaoServiceInstance.emitirCertificado.mockResolvedValue(mockParticipacao as any);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença mínima', async () => {
      participacaoServiceInstance.emitirCertificado.mockRejectedValue(
        new Error('Presença mínima de 75% é necessária para emitir certificado')
      );

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Presença mínima de 75% é necessária para emitir certificado');
    });
  });
});
