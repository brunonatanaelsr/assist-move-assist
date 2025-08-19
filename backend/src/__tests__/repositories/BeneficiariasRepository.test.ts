import { Pool } from 'pg';
import { BeneficiariasRepository } from '../../src/repositories/BeneficiariasRepository';
import { AppError } from '../../src/utils/AppError';
import { Beneficiaria } from '../../src/types/beneficiarias';

describe('BeneficiariasRepository', () => {
  let pool: Pool;
  let repository: BeneficiariasRepository;
  
  beforeAll(() => {
    pool = new Pool({
      host: process.env.TEST_POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
      database: process.env.TEST_POSTGRES_DB || 'movemarias_test',
      user: process.env.TEST_POSTGRES_USER || 'postgres',
      password: process.env.TEST_POSTGRES_PASSWORD || 'postgres'
    });
    repository = new BeneficiariasRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('BEGIN');
  });

  afterEach(async () => {
    await pool.query('ROLLBACK');
  });

  describe('criar', () => {
    it('deve criar uma nova beneficiária com sucesso', async () => {
      const novaBeneficiaria = {
        nome_completo: 'Maria da Silva',
        data_nascimento: new Date('1990-01-01'),
        cpf: '123.456.789-00',
        telefone: '(11) 98765-4321',
        email: 'maria@exemplo.com',
        status: 'ativa' as const,
        usuario_criacao: 1,
        usuario_atualizacao: 1,
        ativo: true
      };

      const beneficiaria = await repository.criar(novaBeneficiaria);

      expect(beneficiaria).toHaveProperty('id');
      expect(beneficiaria.nome_completo).toBe(novaBeneficiaria.nome_completo);
      expect(beneficiaria.cpf).toBe(novaBeneficiaria.cpf);
      expect(beneficiaria.status).toBe(novaBeneficiaria.status);
    });

    it('deve lançar erro ao tentar criar beneficiária com CPF duplicado', async () => {
      const beneficiaria = {
        nome_completo: 'Maria da Silva',
        data_nascimento: new Date('1990-01-01'),
        cpf: '123.456.789-00',
        status: 'ativa' as const,
        usuario_criacao: 1,
        usuario_atualizacao: 1,
        ativo: true
      };

      await repository.criar(beneficiaria);

      await expect(repository.criar(beneficiaria)).rejects.toThrow(AppError);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar uma beneficiária por ID', async () => {
      const novaBeneficiaria = {
        nome_completo: 'Maria da Silva',
        data_nascimento: new Date('1990-01-01'),
        cpf: '123.456.789-00',
        status: 'ativa' as const,
        usuario_criacao: 1,
        usuario_atualizacao: 1,
        ativo: true
      };

      const { id } = await repository.criar(novaBeneficiaria);
      const beneficiaria = await repository.buscarPorId(id);

      expect(beneficiaria.id).toBe(id);
      expect(beneficiaria.nome_completo).toBe(novaBeneficiaria.nome_completo);
    });

    it('deve lançar erro ao buscar beneficiária inexistente', async () => {
      await expect(repository.buscarPorId(9999)).rejects.toThrow(AppError);
    });
  });

  describe('listar', () => {
    beforeEach(async () => {
      const beneficiarias = [
        {
          nome_completo: 'Ana Silva',
          data_nascimento: new Date('1990-01-01'),
          cpf: '111.111.111-11',
          status: 'ativa' as const,
          usuario_criacao: 1,
          usuario_atualizacao: 1,
          ativo: true
        },
        {
          nome_completo: 'Maria Santos',
          data_nascimento: new Date('1992-02-02'),
          cpf: '222.222.222-22',
          status: 'pendente' as const,
          usuario_criacao: 1,
          usuario_atualizacao: 1,
          ativo: true
        }
      ];

      for (const b of beneficiarias) {
        await repository.criar(b);
      }
    });

    it('deve listar beneficiárias com paginação', async () => {
      const result = await repository.listar({}, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('deve filtrar beneficiárias por status', async () => {
      const result = await repository.listar(
        { status: 'ativa' },
        { page: 1, limit: 10 }
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('ativa');
    });

    it('deve buscar beneficiárias por texto', async () => {
      const result = await repository.listar(
        { search: 'Silva' },
        { page: 1, limit: 10 }
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].nome_completo).toContain('Silva');
    });
  });
});
