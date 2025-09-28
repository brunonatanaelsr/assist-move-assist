import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../participacao.controller';
import { ParticipacaoService } from '../../services/participacao.service';
import type { Request, Response, NextFunction } from 'express';

// Mock do ParticipacaoService
jest.mock('../../services/participacao.service');

describe('ParticipacaoController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  let participacaoService: { prototype: any };
  let mockUserId: number;
  let mockPageParam: number;
  let mockLimitParam: number;
  let mockParticipacao: any;
     user: { id: mockUserId }

  beforeEach(() => {
    mockUserId = 1;
    mockPageParam = 1;
    mockLimitParam = 10;

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
    mockNext = jest.fn();
    
   jest.spyOn(ParticipacaoService, 'prototype').mockReturnValue(participacaoService.prototype);
      id: 1,
      beneficiaria_id: 1,
      projeto_id: 1,
      status: 'em_andamento'
    };
    
    participacaoService = {
      prototype: {
   ParticipacaoService.prototype = participacaoService.prototype;
     .mockReturnValue(participacaoService.prototype);
        criarParticipacao: jest.fn(),
        atualizarParticipacao: jest.fn(),
        excluirParticipacao: jest.fn(),
        registrarPresenca: jest.fn(),
        emitirCertificado: jest.fn()
      }
    };
   // Mock dos métodos do serviço
   const mockMethods = {
     listarParticipacoes: jest.fn(),
     criarParticipacao: jest.fn(),
     atualizarParticipacao: jest.fn(),
     excluirParticipacao: jest.fn(),
     registrarPresenca: jest.fn(),
     emitirCertificado: jest.fn()
   };

   Object.assign(ParticipacaoService.prototype, mockMethods);
        pagination: { total: 1 }
      };
      participacaoService.prototype.listarParticipacoes.mockResolvedValue(mockResult);

      mockReq.query = {
        page: '1',
        limit: '10'
      };

      const next = jest.fn();
      mockReq.query = { page: '1', limit: '10' };
      mockReq.user = { id: mockUserId };

      await listarParticipacoes(mockReq, mockRes, next);

      expect(participacaoService.prototype.listarParticipacoes).toHaveBeenCalledWith({
        userId: mockUserId,
        page: mockPageParam,
        limit: mockLimitParam,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('deve tratar erro ao listar participações', async () => {
      participacaoService.prototype.listarParticipacoes.mockRejectedValue(new Error());

      mockReq.user = { id: 1 };
      participacaoService.prototype.listarParticipacoes.mockRejectedValue(new Error());

      await listarParticipacoes(mockReq, mockRes, mockNext);

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
      participacaoService.prototype.criarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.body = {
        beneficiaria_id: 1,
        projeto_id: 1
      };

      mockReq.body = {
        beneficiaria_id: 1,
        projeto_id: 1
      };
      mockReq.user = { id: 1 };

      await criarParticipacao(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de beneficiária não encontrada', async () => {
      mockReq.body = {
        beneficiaria_id: 999,
        projeto_id: 1
      };
      mockReq.user = { id: 1 };

      participacaoService.prototype.criarParticipacao.mockRejectedValue(
        new Error('Beneficiária não encontrada')
      );

      await criarParticipacao(mockReq, mockRes, mockNext);

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
      participacaoService.prototype.atualizarParticipacao.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { status: 'em_andamento' };
      mockReq.user = { id: 1 };

      participacaoService.prototype.atualizarParticipacao.mockResolvedValue(mockParticipacao);

      await atualizarParticipacao(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve tratar erro de participação não encontrada', async () => {
            participacaoService.prototype.atualizarParticipacao.mockRejectedValue(
        new Error('Erro ao atualizar participação')
      );

      mockReq.params = { id: '999' };
      mockReq.user = { id: 1 };
      mockReq.body = { status: 'em_andamento' };

      participacaoService.prototype.atualizarParticipacao.mockRejectedValue(
        new Error('Participação não encontrada')
      );

      await atualizarParticipacao(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Participação não encontrada' 
      });
    });
  });

  describe('excluirParticipacao', () => {
    it('deve excluir participação com sucesso', async () => {
      participacaoService.prototype.excluirParticipacao.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      await excluirParticipacao(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('deve tratar erro de participação não encontrada', async () => {
            participacaoService.prototype.excluirParticipacao.mockRejectedValue(
        new Error('Erro ao excluir participação')
      );

      mockReq.params = { id: '999' };

      await excluirParticipacao(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Participação não encontrada' 
      });
    });
  });

  describe('registrarPresenca', () => {
    it('deve registrar presença com sucesso', async () => {
      mockParticipacao.presenca_percentual = 80;
      participacaoService.prototype.registrarPresenca.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 80 };
      mockReq.user = { id: 1 };

      await registrarPresenca(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve validar presença obrigatória', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};
      mockReq.user = { id: 1 };

      participacaoService.prototype.registrarPresenca.mockRejectedValue(
        new Error('Percentual de presença é obrigatório')
      );

      await registrarPresenca(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Percentual de presença é obrigatório' 
      });
    });

    it('deve validar presença entre 0 e 100', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { presenca: 101 };
      mockReq.user = { id: 1 };

      participacaoService.prototype.registrarPresenca.mockRejectedValue(
        new Error('Percentual de presença deve estar entre 0 e 100')
      );

      await registrarPresenca(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Percentual de presença deve estar entre 0 e 100' 
      });
    });
  });

  describe('emitirCertificado', () => {
    it('deve emitir certificado com sucesso', async () => {
      mockParticipacao.certificado_emitido = true;
      mockParticipacao.status = 'concluida';
      participacaoService.prototype.emitirCertificado.mockResolvedValue(mockParticipacao);

      mockReq.params = { id: '1' };
      mockReq.user = { id: 1 };

      await emitirCertificado(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(mockParticipacao);
    });

    it('deve validar presença mínima', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1 };

      participacaoService.prototype.emitirCertificado.mockRejectedValue(
        new Error('Presença mínima de 75% é necessária para emitir certificado')
      );

      await emitirCertificado(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Presença mínima de 75% é necessária para emitir certificado' 
      });
    });
  });
});
