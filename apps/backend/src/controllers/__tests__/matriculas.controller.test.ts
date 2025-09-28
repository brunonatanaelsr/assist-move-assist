import { criarMatricula, verificarElegibilidade } from '../matriculas.controller';
import {
  MatriculasServiceError,
  matriculasService
} from '../../services/matriculas.service';

jest.mock('../../services/matriculas.service', () => {
  const actual = jest.requireActual('../../services/matriculas.service');
  return {
    ...actual,
    matriculasService: {
      listarMatriculas: jest.fn(),
      criarMatricula: jest.fn(),
      obterMatricula: jest.fn(),
      atualizarMatricula: jest.fn(),
      verificarElegibilidade: jest.fn()
    }
  };
});

const mockedService = matriculasService as jest.Mocked<typeof matriculasService>;

describe('MatriculasController', () => {
  const createMockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarMatricula', () => {
    const requestBody = {
      beneficiaria_id: 1,
      projeto_id: 2
    };

    it('retorna 201 quando o serviço cria a matrícula', async () => {
      const serviceResponse = {
        id: 1,
        beneficiaria_id: requestBody.beneficiaria_id,
        projeto_id: requestBody.projeto_id,
        status_matricula: 'pendente'
      };
      mockedService.criarMatricula.mockResolvedValue(serviceResponse);

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await criarMatricula(req, res);

      expect(mockedService.criarMatricula).toHaveBeenCalledWith(requestBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse,
        message: 'Matrícula criada com sucesso'
      });
    });

    it('propaga o status e mensagem de erros conhecidos', async () => {
      mockedService.criarMatricula.mockRejectedValue(
        new MatriculasServiceError(400, 'Erro de validação')
      );

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await criarMatricula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Erro de validação' });
    });

    it('retorna 500 para erros inesperados', async () => {
      mockedService.criarMatricula.mockRejectedValue(new Error('Falha'));

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await criarMatricula(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno ao criar matrícula'
      });
    });
  });

  describe('verificarElegibilidade', () => {
    const requestBody = {
      beneficiaria_id: 1,
      projeto_id: 2
    };

    it('retorna 200 com o resultado do serviço', async () => {
      const serviceResponse = {
        elegivel: true,
        motivos: [],
        warnings: ['Cadastro incompleto'],
        matricula_existente: null
      };
      mockedService.verificarElegibilidade.mockResolvedValue(serviceResponse);

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await verificarElegibilidade(req, res);

      expect(mockedService.verificarElegibilidade).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: serviceResponse });
    });

    it('propaga erros conhecidos do serviço', async () => {
      mockedService.verificarElegibilidade.mockRejectedValue(
        new MatriculasServiceError(404, 'Projeto não encontrado')
      );

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await verificarElegibilidade(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Projeto não encontrado'
      });
    });

    it('retorna 500 em erros inesperados', async () => {
      mockedService.verificarElegibilidade.mockRejectedValue(new Error('Falha'));

      const req: any = { body: requestBody };
      const res = createMockResponse();

      await verificarElegibilidade(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno ao verificar elegibilidade'
      });
    });
  });
});
