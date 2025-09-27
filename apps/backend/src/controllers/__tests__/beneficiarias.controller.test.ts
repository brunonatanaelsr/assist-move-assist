import { ZodError } from 'zod';
import {
  listarBeneficiarias,
  obterBeneficiaria,
  obterResumoBeneficiaria,
  obterAtividadesBeneficiaria,
  criarBeneficiaria,
  atualizarBeneficiaria,
  removerBeneficiaria
} from '../beneficiarias.controller';
import { BeneficiariasService } from '../../services/beneficiarias.service';
import { AppError } from '../../utils';

jest.mock('../../services/beneficiarias.service');

describe('BeneficiariasController', () => {
  let mockReq: any;
  let mockRes: any;
  let serviceMock: jest.MockedClass<typeof BeneficiariasService>;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 1 }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    serviceMock = BeneficiariasService as jest.MockedClass<typeof BeneficiariasService>;
    serviceMock.prototype.listarAtivas = jest.fn();
    serviceMock.prototype.obterDetalhes = jest.fn();
    serviceMock.prototype.obterResumo = jest.fn();
    serviceMock.prototype.obterAtividades = jest.fn();
    serviceMock.prototype.criarCompleta = jest.fn();
    serviceMock.prototype.atualizarCompleta = jest.fn();
    serviceMock.prototype.remover = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve listar beneficiárias com sucesso', async () => {
    serviceMock.prototype.listarAtivas.mockResolvedValue({ data: [{ id: 1 }], total: 1 });

    mockReq.query = { page: '2', limit: '25' };

    await listarBeneficiarias(mockReq, mockRes);

    expect(serviceMock.prototype.listarAtivas).toHaveBeenCalledWith(2, 25);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deve retornar erro ao listar beneficiárias', async () => {
    serviceMock.prototype.listarAtivas.mockRejectedValue(new Error('erro'));

    await listarBeneficiarias(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('deve retornar beneficiária específica', async () => {
    const beneficiaria = { id: 10 };
    serviceMock.prototype.obterDetalhes.mockResolvedValue(beneficiaria as any);
    mockReq.params = { id: '10' };

    await obterBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.obterDetalhes).toHaveBeenCalledWith(10);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: beneficiaria }));
  });

  it('deve tratar erro de beneficiária não encontrada', async () => {
    serviceMock.prototype.obterDetalhes.mockRejectedValue(new AppError('Não encontrada', 404));
    mockReq.params = { id: '99' };

    await obterBeneficiaria(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('deve obter resumo da beneficiária', async () => {
    const resumo = { beneficiaria: { id: 1 } };
    serviceMock.prototype.obterResumo.mockResolvedValue(resumo as any);
    mockReq.params = { id: '1' };

    await obterResumoBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.obterResumo).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: resumo }));
  });

  it('deve listar atividades da beneficiária', async () => {
    const atividades = { data: [], pagination: { page: 1, limit: 10 } };
    serviceMock.prototype.obterAtividades.mockResolvedValue(atividades as any);
    mockReq.params = { id: '5' };
    mockReq.query = { page: '3', limit: '15' };

    await obterAtividadesBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.obterAtividades).toHaveBeenCalledWith(5, 3, 15);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: atividades }));
  });

  it('deve criar beneficiária com sucesso', async () => {
    const nova = { id: 1 };
    serviceMock.prototype.criarCompleta.mockResolvedValue(nova as any);
    mockReq.body = { nome: 'Teste' };

    await criarBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.criarCompleta).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: nova }));
  });

  it('deve tratar erro de validação ao criar beneficiária', async () => {
    serviceMock.prototype.criarCompleta.mockRejectedValue(new ZodError([]));

    await criarBeneficiaria(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('deve atualizar beneficiária com sucesso', async () => {
    const atualizada = { id: 2 };
    serviceMock.prototype.atualizarCompleta.mockResolvedValue(atualizada as any);
    mockReq.params = { id: '2' };

    await atualizarBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.atualizarCompleta).toHaveBeenCalledWith(2, mockReq.body, 1);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: atualizada }));
  });

  it('deve remover beneficiária com sucesso', async () => {
    const mensagem = { message: 'ok' };
    serviceMock.prototype.remover.mockResolvedValue(mensagem as any);
    mockReq.params = { id: '3' };

    await removerBeneficiaria(mockReq, mockRes);

    expect(serviceMock.prototype.remover).toHaveBeenCalledWith(3, 1);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mensagem }));
  });

  it('deve tratar erro ao remover beneficiária', async () => {
    serviceMock.prototype.remover.mockRejectedValue(new AppError('Erro', 500));

    await removerBeneficiaria(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
