import { Participacao } from '../validators/participacao.validator';
import { ParticipacaoService } from '../services/participacao.service';
import pool from '../config/database';
import redis from '../config/redis';

describe('ParticipacaoService', () => {
  let participacaoService: ParticipacaoService;

  beforeEach(() => {
    participacaoService = new ParticipacaoService(pool, redis);
  });

  describe('listarParticipacoes', () => {
    it('deve listar participações com filtros', async () => {
      // Mock das consultas ao banco
      const mockQuery = jest.spyOn(pool, 'query');
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            beneficiaria_id: 1,
            projeto_id: 1,
            status: 'inscrita',
            projeto_nome: 'Projeto Teste',
            beneficiaria_nome: 'Maria Teste',
            total_count: '1'
          }
        ]
      });

      const result = await participacaoService.listarParticipacoes({
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('criarParticipacao', () => {
    it('deve criar uma nova participação', async () => {
      // Mock das consultas ao banco
      const mockQuery = jest.spyOn(pool, 'query');
      
      // Mock beneficiária
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock projeto
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock check participação existente
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock criação participação
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          beneficiaria_id: 1,
          projeto_id: 1,
          status: 'inscrita'
        }]
      });

      const result = await participacaoService.criarParticipacao({
        beneficiaria_id: 1,
        projeto_id: 1
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe('inscrita');
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it('deve falhar se beneficiária não existir', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(participacaoService.criarParticipacao({
        beneficiaria_id: 999,
        projeto_id: 1
      })).rejects.toThrow('Beneficiária não encontrada');
    });
  });

  describe('atualizarParticipacao', () => {
    it('deve atualizar uma participação existente', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      
      // Mock check participação
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, beneficiaria_id: 1 }]
      });

      // Mock atualização
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          status: 'em_andamento',
          observacoes: 'Teste'
        }]
      });

      const result = await participacaoService.atualizarParticipacao(1, {
        status: 'em_andamento',
        observacoes: 'Teste'
      });

      expect(result.status).toBe('em_andamento');
      expect(result.observacoes).toBe('Teste');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('deve falhar se participação não existir', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(participacaoService.atualizarParticipacao(999, {
        status: 'em_andamento'
      })).rejects.toThrow('Participação não encontrada');
    });
  });

  describe('registrarPresenca', () => {
    it('deve registrar presença para uma participação', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      
      // Mock check participação
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, beneficiaria_id: 1 }]
      });

      // Mock atualização
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          presenca_percentual: 80
        }]
      });

      const result = await participacaoService.registrarPresenca(1, 80);

      expect(result.presenca_percentual).toBe(80);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('deve falhar se percentual inválido', async () => {
      await expect(participacaoService.registrarPresenca(1, 101))
        .rejects.toThrow('Percentual de presença deve estar entre 0 e 100');
    });
  });

  describe('emitirCertificado', () => {
    it('deve emitir certificado se presença suficiente', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      
      // Mock check participação
      mockQuery.mockResolvedValueOnce({
        rows: [{ 
          id: 1, 
          beneficiaria_id: 1,
          presenca_percentual: 80 
        }]
      });

      // Mock atualização
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          certificado_emitido: true,
          status: 'concluida'
        }]
      });

      const result = await participacaoService.emitirCertificado(1);

      expect(result.certificado_emitido).toBe(true);
      expect(result.status).toBe('concluida');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('deve falhar se presença insuficiente', async () => {
      const mockQuery = jest.spyOn(pool, 'query');
      mockQuery.mockResolvedValueOnce({
        rows: [{ 
          id: 1, 
          presenca_percentual: 70 
        }]
      });

      await expect(participacaoService.emitirCertificado(1))
        .rejects.toThrow('Presença mínima de 75% é necessária para emitir certificado');
    });
  });
});
