import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { AppError } from '../utils';

const atualizarParticipacaoMock: any = jest.fn();

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../config/redis', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../services/participacao.service', () => ({
  __esModule: true,
  ParticipacaoService: jest.fn().mockImplementation(() => ({
    listarParticipacoes: jest.fn(),
    criarParticipacao: jest.fn(),
    atualizarParticipacao: atualizarParticipacaoMock,
    excluirParticipacao: jest.fn(),
    registrarPresenca: jest.fn(),
    emitirCertificado: jest.fn()
  }))
}));

import { atualizarParticipacao } from '../controllers/participacao.controller';

describe('participacao.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 400 quando nenhum campo é fornecido para atualização', async () => {
    const req: any = { params: { id: '1' }, body: {} };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    atualizarParticipacaoMock.mockRejectedValueOnce(new AppError('Nenhum campo fornecido para atualização', 400));

    await atualizarParticipacao(req, res, next as any);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Nenhum campo fornecido para atualização',
      statusCode: 400
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
