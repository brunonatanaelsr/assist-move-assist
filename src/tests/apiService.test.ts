import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do axios antes das importações
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

// Importações após o mock
import { ApiService } from '../services/apiService';
import axios from 'axios';

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxiosInstance: any;
  const testId = '1';

  beforeEach(() => {
    // Limpar localStorage e mocks
    localStorage.clear();
    vi.clearAllMocks();
    
    // Configurar o mock instance que será retornado por axios.create()
    mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    
    // Fazer axios.create retornar nossa instância mockada
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
    
    // Criar nova instância do serviço
    apiService = new ApiService();
  });

  // Mock de resposta padrão
  const mockSuccessResponse = {
    data: {
      success: true,
      data: { id: testId, nome: 'Test' }
    }
  };

  // =============== TESTES DE AUTENTICAÇÃO ===============
  describe('Autenticação', () => {
    it('deve fazer login com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'fake-token',
            user: { id: 1, email: 'test@example.com' }
          }
        }
      };

      vi.spyOn(Storage.prototype, 'setItem');
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await apiService.login('test@example.com', 'password');
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('token');
      expect(localStorage.getItem('token')).toBe('fake-token');
    });

    it('deve obter usuário atual', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, email: 'test@example.com' }
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const response = await apiService.getCurrentUser();
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
    });

    it('deve lidar com erro de login', async () => {
      const errorMessage = 'Credenciais inválidas';
      mockAxiosInstance.post.mockRejectedValueOnce(new Error(errorMessage));

      const response = await apiService.login('test@example.com', 'wrong-password');
      expect(response.success).toBe(false);
      expect(response.message).toBe(errorMessage);
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  // =============== TESTES DE OFICINAS ===============
  describe('Oficinas CRUD', () => {
    it('deve criar uma nova oficina', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce(mockSuccessResponse);

      const oficinaData = {
        nome: 'Oficina de Teste',
        descricao: 'Descrição da oficina de teste',
        data_inicio: '2025-09-01',
        data_fim: '2025-09-30',
        vagas: 20,
        status: 'ativa'
      };

      const response = await apiService.createOficina(oficinaData);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
    });

    it('deve listar oficinas', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { id: '1', nome: 'Oficina 1' },
            { id: '2', nome: 'Oficina 2' }
          ]
        }
      });

      const response = await apiService.getOficinas();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('deve atualizar uma oficina', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce(mockSuccessResponse);

      const updateData = {
        nome: 'Oficina Atualizada',
        vagas: 25
      };

      const response = await apiService.updateOficina(testId, updateData);
      expect(response.success).toBe(true);
      expect(response.data.nome).toBe('Test');
    });

    it('deve deletar uma oficina', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Oficina removida com sucesso'
        }
      });

      const response = await apiService.deleteOficina(testId);
      expect(response.success).toBe(true);
    });
  });

  // =============== TESTES DE BENEFICIÁRIAS ===============
  describe('Beneficiárias CRUD', () => {
    it('deve criar uma nova beneficiária', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce(mockSuccessResponse);

      const beneficiariaData = {
        nome: 'Maria Teste',
        cpf: '123.456.789-00',
        data_nascimento: '1990-01-01',
        telefone: '(11) 98765-4321',
        endereco: 'Rua Teste, 123',
        status: 'ativa'
      };

      const response = await apiService.createBeneficiaria(beneficiariaData);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
    });

    it('deve listar beneficiárias', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { id: '1', nome: 'Beneficiária 1' },
            { id: '2', nome: 'Beneficiária 2' }
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      });

      const response = await apiService.getBeneficiarias();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response).toHaveProperty('pagination');
    });

    it('deve obter uma beneficiária específica', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce(mockSuccessResponse);

      const response = await apiService.getBeneficiaria(testId);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
    });

    it('deve atualizar uma beneficiária', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce(mockSuccessResponse);

      const updateData = {
        nome: 'Maria Teste Atualizado',
        telefone: '(11) 99999-9999'
      };

      const response = await apiService.updateBeneficiaria(testId, updateData);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
    });

    it('deve deletar uma beneficiária', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Beneficiária removida com sucesso'
        }
      });

      const response = await apiService.deleteBeneficiaria(testId);
      expect(response.success).toBe(true);
    });
  });

  // =============== TESTES DE UPLOAD ===============
  describe('Upload', () => {
    it('deve fazer upload de imagem com sucesso', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            url: 'http://example.com/image.jpg',
            filename: 'image.jpg'
          }
        }
      });

      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const response = await apiService.uploadImage(mockFile);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('url');
      expect(response.data).toHaveProperty('filename');
    });

    it('deve lidar com erro no upload de imagem', async () => {
      const errorMessage = 'Erro no upload da imagem';
      mockAxiosInstance.post.mockRejectedValueOnce(new Error(errorMessage));

      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const response = await apiService.uploadImage(mockFile);

      expect(response.success).toBe(false);
      expect(response.message).toBe(errorMessage);
    });
  });

  // =============== TESTES DE HEALTH CHECK ===============
  describe('Health Check', () => {
    it('deve verificar saúde do sistema', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          status: 'healthy',
          version: '1.0.0'
        }
      });

      const response = await apiService.healthCheck();
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('status', 'healthy');
    });

    it('deve lidar com erro de conexão', async () => {
      const errorMessage = 'Backend não está respondendo';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));

      const response = await apiService.healthCheck();
      expect(response.success).toBe(false);
      expect(response.message).toBe(errorMessage);
    });
  });

  // =============== TESTES DE INTERCEPTADORES ===============
  describe('Interceptadores', () => {
    it('deve configurar interceptadores corretamente', async () => {
      // Verificar se os interceptadores foram configurados
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});
