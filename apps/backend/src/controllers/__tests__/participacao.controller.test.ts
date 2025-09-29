import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../participacao.controller';
import { AppError, ValidationError } from '../../utils';

type MockService = {
  listarParticipacoes: jest.Mock;
  criarParticipacao: jest.Mock;
  atualizarParticipacao: jest.Mock;
  excluirParticipacao: jest.Mock;
  registrarPresenca: jest.Mock;
  emitirCertificado: jest.Mock;
};

jest.mock('../../services/participacao.service', () => {
  const service: MockService = {
    listarParticipacoes: jest.fn(),
    criarParticipacao: jest.fn(),
    atualizarParticipacao: jest.fn(),
    excluirParticipacao: jest.fn(),
    registrarPresenca: jest.fn(),
    emitirCertificado: jest.fn()
  };

  return {
    ParticipacaoService: jest.fn().mockImplementation(() => service),
    __mockService: service
  };
});

const { __mockService: mockService } = jest.requireMock('../../services/participacao.service') as { __mockService: MockService };

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
    Object.values(mockService).forEach((fn) => fn.mockReset());
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
      mockService.listarParticipacoes.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      await listarParticipacoes(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      expect(mockService.listarParticipacoes).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('deve tratar erro ao listar participações', async () => {
      mockService.listarParticipacoes.mockRejectedValue(new Error());

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
      mockService.criarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.body = {
        beneficiaria_id: 1,
        projeto_id: 1
      };

      await criarParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de beneficiária não encontrada', async () => {
      mockService.criarParticipacao.mockRejectedValue(
        new AppError('Beneficiária não encontrada', 404)
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
      mockService.atualizarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };

      await atualizarParticipacao(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de participação não encontrada', async () => {
      mockService.atualizarParticipacao.mockRejectedValue(
        new AppError('Participação não encontrada', 404)
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
      mockService.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
      mockService.excluirParticipacao.mockRejectedValue(
        new AppError('Participação não encontrada', 404)
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
      mockService.registrarPresenca.mockResolvedValue(mockParticipacao);

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
      mockService.registrarPresenca.mockRejectedValue(
        new ValidationError('Percentual de presença deve estar entre 0 e 100')
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
      mockService.emitirCertificado.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };

      await emitirCertificado(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve validar presença mínima', async () => {
      mockService.emitirCertificado.mockRejectedValue(
        new ValidationError('Presença mínima de 75% é necessária para emitir certificado')
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
