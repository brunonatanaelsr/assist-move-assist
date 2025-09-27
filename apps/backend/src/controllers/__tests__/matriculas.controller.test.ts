jest.mock('../../services/cache.service', () => ({
  cacheService: {
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined)
  }
}));

import { criarMatricula, verificarElegibilidade } from '../matriculas-fixed.controller';
import { mockPool } from '../../setupTests';

describe('MatriculasController - status do projeto', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  const baseRequestBody = {
    beneficiaria_id: 1,
    projeto_id: 2,
    motivacao_participacao: 'Motivação',
    expectativas: 'Expectativas'
  };

  const createMockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (mockPool.connect as jest.Mock).mockReset();
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('criarMatricula', () => {
    it.each([
      'planejamento',
      'em_andamento',
      'pausado'
    ])('permite matrícula quando o projeto está em %s', async status => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: baseRequestBody.beneficiaria_id }] })
        .mockResolvedValueOnce({ rows: [{ id: baseRequestBody.projeto_id, status }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 99, beneficiaria_id: 1, projeto_id: 2 }] })
        .mockResolvedValue({});

      const req: any = { body: baseRequestBody };
      const res = createMockResponse();

      await criarMatricula(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Matrícula criada com sucesso'
      }));
    });

    it.each([
      'cancelado',
      'concluido'
    ])('bloqueia matrícula quando o projeto está %s', async status => {
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: baseRequestBody.beneficiaria_id }] })
        .mockResolvedValueOnce({ rows: [{ id: baseRequestBody.projeto_id, status }] });

      const req: any = { body: baseRequestBody };
      const res = createMockResponse();

      await criarMatricula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Projetos cancelados ou concluídos não aceitam novas matrículas'
      });
    });
  });

  describe('verificarElegibilidade', () => {
    const createReq = () => ({
      body: {
        beneficiaria_id: 1,
        projeto_id: 2
      }
    });

    it.each([
      'planejamento',
      'em_andamento',
      'pausado'
    ])('considera elegível quando o status do projeto é %s', async status => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, status }] })
        .mockResolvedValueOnce({ rows: [] });

      const req = createReq();
      const res = { json: jest.fn() } as any;

      await verificarElegibilidade(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          elegivel: true,
          motivos: []
        })
      }));
    });

    it.each([
      'cancelado',
      'concluido'
    ])('marca como não elegível quando o status do projeto é %s', async status => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, status }] })
        .mockResolvedValueOnce({ rows: [] });

      const req = createReq();
      const res = { json: jest.fn() } as any;

      await verificarElegibilidade(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          elegivel: false,
          motivos: expect.arrayContaining([
            'Projetos cancelados ou concluídos não aceitam novas matrículas'
          ])
        })
      }));
    });
  });
});
