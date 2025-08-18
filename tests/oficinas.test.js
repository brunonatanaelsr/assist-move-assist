const request = require('supertest');
const app = require('../app-production');
const { Pool } = require('pg');

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe('Módulo de Oficinas', () => {
  let pool;

  beforeEach(() => {
    pool = new Pool();
    pool.query.mockReset();
  });

  describe('Gerenciamento de Oficinas', () => {
    test('Deve criar uma nova oficina com sucesso', async () => {
      const mockOficina = {
        id: 1,
        nome: 'Workshop de Empreendedorismo',
        descricao: 'Como iniciar seu próprio negócio',
        data_inicio: '2025-09-01',
        data_fim: '2025-09-15',
        horario_inicio: '14:00',
        horario_fim: '17:00',
        local: 'Sala 101',
        vagas_totais: 20,
        status_detalhado: 'em_planejamento'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockOficina] });

      const response = await request(app)
        .post('/api/oficinas')
        .send(mockOficina)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(mockOficina);
    });

    test('Deve validar campos obrigatórios ao criar oficina', async () => {
      const response = await request(app)
        .post('/api/oficinas')
        .send({})
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Lista de Espera', () => {
    test('Deve adicionar beneficiária à lista de espera', async () => {
      const mockOficina = {
        id: 1,
        vagas_total: 20,
        vagas_ocupadas: 20,
        tem_lista_espera: true,
        lista_espera_limite: 5
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockOficina] }) // oficina check
        .mockResolvedValueOnce({ rows: [] }) // inscrição check
        .mockResolvedValueOnce({ rows: [] }) // lista espera check
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count lista espera
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // inserção

      const response = await request(app)
        .post('/api/lista-espera')
        .send({ oficina_id: 1 })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Avaliações', () => {
    test('Deve registrar avaliação com sucesso', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // participação check
        .mockResolvedValueOnce({ rows: [] }) // avaliação existente check
        .mockResolvedValueOnce({ rows: [{ id: 1, nota: 5 }] }); // inserção

      const response = await request(app)
        .post('/api/avaliacoes')
        .send({
          oficina_id: 1,
          nota: 5,
          comentario: 'Ótima oficina!',
          aspectos_positivos: ['Didática clara', 'Material completo']
        })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Controle de Presenças', () => {
    test('Deve registrar presença com sucesso', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // inscrição check
        .mockResolvedValueOnce({ rows: [] }) // presença existente check
        .mockResolvedValueOnce({ rows: [{ id: 1, presente: true }] }); // inserção

      const response = await request(app)
        .post('/api/presencas')
        .send({
          oficina_id: 1,
          beneficiaria_id: 1,
          data_encontro: '2025-09-01',
          presente: true
        })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
