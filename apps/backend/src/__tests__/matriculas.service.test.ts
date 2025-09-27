import { MatriculasService, MatriculaData } from '../services/matriculas.service';
import { AppError } from '../utils';
import type { MatriculasRepository } from '../repositories/matriculas.repository';
import type { PoolClient } from 'pg';

describe('MatriculasService', () => {
  const repositoryMock = {
    listMatriculas: jest.fn(),
    findBeneficiariaById: jest.fn(),
    findProjetoById: jest.fn(),
    findMatriculaByBeneficiariaAndProjeto: jest.fn(),
    createMatricula: jest.fn(),
    createParticipacao: jest.fn(),
    marcarMatriculaComoAprovada: jest.fn()
  } as unknown as jest.Mocked<MatriculasRepository>;

  const cacheMock = {
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined)
  };

  const mockClient = {} as PoolClient;
  const transactionMock = jest.fn(async <T>(callback: (client: PoolClient) => Promise<T>) => callback(mockClient));

  let service: MatriculasService;

  const baseMatricula: MatriculaData = {
    beneficiaria_id: 1,
    projeto_id: 2,
    motivacao_participacao: 'Motivação',
    expectativas: 'Expectativas'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatriculasService(repositoryMock, cacheMock as any, transactionMock as any);
  });

  it('deve listar matriculas com filtros e paginação', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    (repositoryMock.listMatriculas as jest.Mock).mockResolvedValue(rows);

    const result = await service.listarMatriculas({ page: 2, limit: 5, beneficiariaId: 7 });

    expect(repositoryMock.listMatriculas).toHaveBeenCalledWith({
      beneficiariaId: 7,
      projetoId: undefined,
      statusMatricula: undefined,
      limit: 5,
      offset: 5
    });
    expect(cacheMock.deletePattern).toHaveBeenCalledWith('cache:matriculas:*');
    expect(result).toEqual({
      data: rows,
      pagination: { page: 2, limit: 5, total: rows.length }
    });
  });

  it('deve falhar quando beneficiaria não existe', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue(null);

    await expect(service.criarMatricula(baseMatricula)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Beneficiária não encontrada'
    });
    expect(repositoryMock.findProjetoById).not.toHaveBeenCalled();
  });

  it('deve falhar quando projeto está cancelado ou concluído', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue({ id: 1 });
    (repositoryMock.findProjetoById as jest.Mock).mockResolvedValue({ id: 2, status: 'Cancelado' });

    await expect(service.criarMatricula(baseMatricula)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Projetos cancelados ou concluídos não aceitam novas matrículas'
    });
    expect(repositoryMock.findMatriculaByBeneficiariaAndProjeto).not.toHaveBeenCalled();
  });

  it('deve falhar quando já existe matrícula para o projeto', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue({ id: 1 });
    (repositoryMock.findProjetoById as jest.Mock).mockResolvedValue({ id: 2, status: 'planejamento' });
    (repositoryMock.findMatriculaByBeneficiariaAndProjeto as jest.Mock).mockResolvedValue({ id: 99 });

    await expect(service.criarMatricula(baseMatricula)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Beneficiária já possui matrícula neste projeto'
    });
    expect(repositoryMock.createMatricula).not.toHaveBeenCalled();
  });

  it('deve criar matrícula e limpar caches', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue({ id: 1 });
    (repositoryMock.findProjetoById as jest.Mock).mockResolvedValue({ id: 2, status: 'em_andamento' });
    (repositoryMock.findMatriculaByBeneficiariaAndProjeto as jest.Mock).mockResolvedValue(null);
    (repositoryMock.createMatricula as jest.Mock).mockResolvedValue({
      id: 10,
      beneficiaria_id: 1,
      projeto_id: 2,
      status_matricula: 'pendente'
    });

    const result = await service.criarMatricula(baseMatricula);

    expect(repositoryMock.createMatricula).toHaveBeenCalledWith(expect.any(Object), mockClient);
    expect(cacheMock.delete).toHaveBeenCalledWith('cache:beneficiaria:1');
    expect(cacheMock.delete).toHaveBeenCalledWith('cache:projeto:2');
    expect(cacheMock.deletePattern).toHaveBeenCalledWith('cache:matriculas:*');
    expect(result).toMatchObject({ id: 10 });
  });

  it('deve criar participação automática quando matrícula aprovada', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue({ id: 1 });
    (repositoryMock.findProjetoById as jest.Mock).mockResolvedValue({ id: 2, status: 'em_andamento' });
    (repositoryMock.findMatriculaByBeneficiariaAndProjeto as jest.Mock).mockResolvedValue(null);
    (repositoryMock.createMatricula as jest.Mock).mockResolvedValue({
      id: 10,
      beneficiaria_id: 1,
      projeto_id: 2,
      status_matricula: 'aprovada'
    });

    await service.criarMatricula({ ...baseMatricula, status_matricula: 'aprovada' });

    expect(repositoryMock.createParticipacao).toHaveBeenCalledWith(2, 1, mockClient);
    expect(repositoryMock.marcarMatriculaComoAprovada).toHaveBeenCalledWith(10, mockClient);
  });

  it('deve avaliar elegibilidade com projeto inativo', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue({ id: 1 });
    (repositoryMock.findProjetoById as jest.Mock).mockResolvedValue({ id: 2, status: 'concluido' });
    (repositoryMock.findMatriculaByBeneficiariaAndProjeto as jest.Mock).mockResolvedValue(null);

    const result = await service.verificarElegibilidade(1, 2);

    expect(result.elegivel).toBe(false);
    expect(result.motivos).toContain('Projetos cancelados ou concluídos não aceitam novas matrículas');
  });

  it('deve lançar erro quando beneficiária não existe na elegibilidade', async () => {
    (repositoryMock.findBeneficiariaById as jest.Mock).mockResolvedValue(null);

    await expect(service.verificarElegibilidade(1, 2)).rejects.toBeInstanceOf(AppError);
  });
});
