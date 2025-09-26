import { BeneficiariaRepository } from '../BeneficiariaRepository';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  truncateAllTables,
  dbAssertions,
  measureQueryPerformance
} from '../../__tests__/helpers/database';
import { factory } from 'factory-girl';
import { NotFoundError, ValidationError } from '../../utils/errors';

describe('BeneficiariaRepository', () => {
  let repository: BeneficiariaRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repository = new BeneficiariaRepository();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  describe('create', () => {
    it('deve criar uma nova beneficiária', async () => {
      const beneficiariaData = await factory.attrs('beneficiaria');
      const created = await repository.create(beneficiariaData);

      expect(created).toHaveProperty('id');
      expect(created.nome_completo).toBe(beneficiariaData.nome_completo);
      
      // Verificar se foi salvo no banco
      const exists = await dbAssertions.recordExists('beneficiarias', {
        id: created.id
      });
      expect(exists).toBe(true);
    });

    it('deve validar CPF único', async () => {
      const beneficiaria1 = await factory.attrs('beneficiaria');
      await repository.create(beneficiaria1);

      const beneficiaria2 = await factory.attrs('beneficiaria', {
        cpf: beneficiaria1.cpf
      });

      await expect(repository.create(beneficiaria2))
        .rejects
        .toThrow(ValidationError);
    });

    it('deve criar com performance aceitável', async () => {
      const beneficiariaData = await factory.attrs('beneficiaria');
      
      const performance = await measureQueryPerformance(
        'INSERT INTO beneficiarias (nome_completo, cpf, data_nascimento, telefone, email, endereco) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [
          beneficiariaData.nome_completo,
          beneficiariaData.cpf,
          beneficiariaData.data_nascimento,
          beneficiariaData.telefone,
          beneficiariaData.email,
          beneficiariaData.endereco
        ],
        10
      );

      expect(performance.averageTime).toBeLessThan(50); // 50ms
    });
  });

  describe('findById', () => {
    it('deve encontrar beneficiária por ID', async () => {
      const created = await factory.create('beneficiaria');
      const found = await repository.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        nome_completo: created.nome_completo
      });
    });

    it('deve retornar null para ID inexistente', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar beneficiária existente', async () => {
      const created = await factory.create('beneficiaria');
      const updateData = {
        nome_completo: 'Novo Nome',
        telefone: '11999999999'
      };

      const updated = await repository.update(created.id, updateData);
      expect(updated.nome_completo).toBe(updateData.nome_completo);
      expect(updated.telefone).toBe(updateData.telefone);

      // Verificar se foi atualizado no banco
      const record = await dbAssertions.getRecord('beneficiarias', {
        id: created.id
      });
      expect(record.nome_completo).toBe(updateData.nome_completo);
    });

    it('deve lançar erro ao atualizar inexistente', async () => {
      await expect(repository.update(
        '00000000-0000-0000-0000-000000000000',
        { nome_completo: 'Teste' }
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deve deletar beneficiária existente', async () => {
      const created = await factory.create('beneficiaria');
      await repository.delete(created.id);

      const exists = await dbAssertions.recordExists('beneficiarias', {
        id: created.id
      });
      expect(exists).toBe(false);
    });

    it('deve lançar erro ao deletar inexistente', async () => {
      await expect(repository.delete(
        '00000000-0000-0000-0000-000000000000'
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('deve buscar beneficiárias por nome', async () => {
      await factory.createMany('beneficiaria', 5);
      await factory.create('beneficiaria', {
        nome_completo: 'Maria da Silva'
      });

      const results = await repository.search('Maria');
      expect(results).toHaveLength(1);
      expect(results[0].nome_completo).toBe('Maria da Silva');
    });

    it('deve ter performance aceitável com muitos registros', async () => {
      await factory.createMany('beneficiaria', 1000);

      const performance = await measureQueryPerformance(
        'SELECT * FROM beneficiarias WHERE nome_completo ILIKE $1',
        ['%Maria%'],
        5
      );

      expect(performance.averageTime).toBeLessThan(100); // 100ms
    });
  });

  describe('findByCPF', () => {
    it('deve encontrar beneficiária por CPF', async () => {
      const created = await factory.create('beneficiaria');
      const found = await repository.findByCPF(created.cpf);

      expect(found).toMatchObject({
        id: created.id,
        cpf: created.cpf
      });
    });

    it('deve retornar null para CPF inexistente', async () => {
      const found = await repository.findByCPF('12345678901');
      expect(found).toBeNull();
    });
  });
});
