import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../participacao.controller';
import { AppError, ValidationError } from '../../utils';

type ParticipacaoServiceMocks = {
  listarParticipacoes: jest.Mock;
  criarParticipacao: jest.Mock;
  atualizarParticipacao: jest.Mock;
  excluirParticipacao: jest.Mock;
  registrarPresenca: jest.Mock;
  emitirCertificado: jest.Mock;
};

jest.mock('../../services/participacao.service', () => {
  const serviceMocks: ParticipacaoServiceMocks = {
    listarParticipacoes: jest.fn(),
    criarParticipacao: jest.fn(),
    atualizarParticipacao: jest.fn(),
    excluirParticipacao: jest.fn(),
    registrarPresenca: jest.fn(),
    emitirCertificado: jest.fn()
  };

  return {
    ParticipacaoService: jest.fn().mockImplementation(() => serviceMocks),
    __mocks: serviceMocks
  };
});

const {
  listarParticipacoes: mockListarParticipacoes,
  criarParticipacao: mockCriarParticipacao,
  atualizarParticipacao: mockAtualizarParticipacao,
  excluirParticipacao: mockExcluirParticipacao,
  registrarPresenca: mockRegistrarPresenca,
  emitirCertificado: mockEmitirCertificado
} = (jest.requireMock('../../services/participacao.service') as { __mocks: ParticipacaoServiceMocks }).__mocks;

describe('ParticipacaoController', () => {
  let mockReq: any;
  let mockRes: any;
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
    mockListarParticipacoes.mockReset();
    mockCriarParticipacao.mockReset();
    mockAtualizarParticipacao.mockReset();
    mockExcluirParticipacao.mockReset();
    mockRegistrarPresenca.mockReset();
    mockEmitirCertificado.mockReset();
    next = jest.fn();
  });

  describe('listarParticipacoes', () => {
    it('deve listar participações com sucesso', async () => {
      const mockResult = {
        data: [{ id: 1 }],
        pagination: { total: 1 }
      };
      mockListarParticipacoes.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarParticipacoes(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(mockListarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro ao listar participações', async () => {
      mockListarParticipacoes.mockRejectedValue(new Error());

      await listarParticipacoes(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0] as AppError;
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
      mockCriarParticipacao.mockResolvedValue(mockParticipacao);

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
      mockCriarParticipacao.mockRejectedValue(error);

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
      mockAtualizarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const error = new Error('Participação não encontrada');
      mockAtualizarParticipacao.mockRejectedValue(error);

      mockReq.params = { id: '999' };

      await atualizarParticipacao(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      mockExcluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      const error = new Error('Participação não encontrada');
      mockExcluirParticipacao.mockRejectedValue(error);

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
      mockRegistrarPresenca.mockResolvedValue(mockParticipacao);

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

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Percentual de presença é obrigatório');
    });

    it('deve validar presença entre 0 e 100', async () => {
      const error = new Error('Percentual de presença deve estar entre 0 e 100');
      mockRegistrarPresenca.mockRejectedValue(error);

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
      mockEmitirCertificado.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve validar presença mínima', async () => {
      const error = new Error('Presença mínima de 75% é necessária para emitir certificado');
      mockEmitirCertificado.mockRejectedValue(error);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
