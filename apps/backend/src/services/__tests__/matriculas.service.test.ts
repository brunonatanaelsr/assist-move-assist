import { MatriculasService, MatriculasServiceError } from '../matriculas.service';

describe('MatriculasService', () => {
  const baseData = {
    beneficiaria_id: 1,
    projeto_id: 2,
    motivacao_participacao: 'Motivação',
    expectativas: 'Expectativas'
  } as any;

  let pool: any;
  let cache: any;
  let client: any;
  let service: MatriculasService;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(client)
    };

    cache = {
      delete: jest.fn().mockResolvedValue(undefined),
      deletePattern: jest.fn().mockResolvedValue(undefined)
    };

    service = new MatriculasService(pool, cache);
  });

  describe('criarMatricula', () => {
    it.each(['planejamento', 'em_andamento', 'pausado'])(
      'permite matrícula quando o projeto está em %s',
      async (status) => {
        client.query
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rows: [{ id: baseData.beneficiaria_id }] })
          .mockResolvedValueOnce({ rows: [{ id: baseData.projeto_id, status }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 99, beneficiaria_id: 1, projeto_id: 2 }] })
          .mockResolvedValueOnce({});

        const result = await service.criarMatricula(baseData);

        expect(result).toEqual(expect.objectContaining({ id: 99 }));
        expect(cache.delete).toHaveBeenCalledWith('cache:beneficiaria:1');
        expect(cache.delete).toHaveBeenCalledWith('cache:projeto:2');
        expect(cache.deletePattern).toHaveBeenCalledWith('cache:matriculas:*');
        expect(client.release).toHaveBeenCalled();
      }
    );

    it.each(['cancelado', 'concluido'])(
      'bloqueia matrícula quando o projeto está %s',
      async (status) => {
        client.query
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rows: [{ id: baseData.beneficiaria_id }] })
          .mockResolvedValueOnce({ rows: [{ id: baseData.projeto_id, status }] })
          .mockResolvedValueOnce({});

        await expect(service.criarMatricula(baseData)).rejects.toEqual(
          new MatriculasServiceError(
            400,
            'Projetos cancelados ou concluídos não aceitam novas matrículas'
          )
        );

        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalled();
      }
    );
  });

  describe('verificarElegibilidade', () => {
    beforeEach(() => {
      pool.query.mockReset();
    });

    it.each(['planejamento', 'em_andamento', 'pausado'])(
      'considera elegível quando o status do projeto é %s',
      async (status) => {
        pool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id: 2, status }] })
          .mockResolvedValueOnce({ rows: [] });

        const resultado = await service.verificarElegibilidade(1, 2);

        expect(resultado).toEqual(
          expect.objectContaining({
            elegivel: true,
            motivos: []
          })
        );
      }
    );

    it.each(['cancelado', 'concluido'])(
      'marca como não elegível quando o status do projeto é %s',
      async (status) => {
        pool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id: 2, status }] })
          .mockResolvedValueOnce({ rows: [] });

        const resultado = await service.verificarElegibilidade(1, 2);

        expect(resultado).toEqual(
          expect.objectContaining({
            elegivel: false,
            motivos: expect.arrayContaining([
              'Projetos cancelados ou concluídos não aceitam novas matrículas'
            ])
          })
        );
      }
    );
  });

  describe('listarMatriculas', () => {
    const paginationParams = {
      page: 2,
      limit: 5,
      beneficiariaId: undefined,
      projetoId: undefined,
      statusMatricula: undefined
    };

    it('utiliza a contagem total retornada pelo banco', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 12 }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1 },
            { id: 2 }
          ]
        });

      const result = await service.listarMatriculas(paginationParams);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(cache.deletePattern).toHaveBeenCalledWith('cache:matriculas:*');
      expect(result.pagination).toEqual({
        page: paginationParams.page,
        limit: paginationParams.limit,
        total: 12,
        totalPages: 3
      });
      expect(result.data).toEqual([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 })
      ]);
    });

    it('retorna total e totalPages zerados quando não há registros', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.listarMatriculas(paginationParams);

      expect(result.pagination).toEqual({
        page: paginationParams.page,
        limit: paginationParams.limit,
        total: 0,
        totalPages: 0
      });
      expect(result.data).toEqual([]);
    });

    it('mantém o total verdadeiro ao solicitar página além do fim', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 12 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.listarMatriculas({ ...paginationParams, page: 5 });

      expect(result.pagination).toEqual({
        page: 5,
        limit: paginationParams.limit,
        total: 12,
        totalPages: 3
      });
      expect(result.data).toEqual([]);
    });
  });
});
