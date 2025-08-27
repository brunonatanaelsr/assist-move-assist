import { TypedRequest, TypedResponse } from '../types/express';
import pool from '../config/database';
import { logger } from '../config/logger';
import { PlanoAcao, PlanoAcaoInput, PlanoAcaoResponse } from '../models/PlanoAcao';

interface PlanoAcaoParams {
  id?: string;
}

export const planoAcaoController = {
  async listar(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const result = await pool.query<PlanoAcao>(
        'SELECT * FROM planos_acao ORDER BY data_criacao DESC'
      );
      return res.json({ data: result.rows });
    } catch (error) {
      logger.error('Erro ao listar planos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async obterPorId(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const { id } = req.params;
      const result = await pool.query<PlanoAcao>(
        'SELECT * FROM planos_acao WHERE id = $1',
        [id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json({ data: result.rows[0] });
    } catch (error) {
      logger.error('Erro ao obter plano:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async criar(req: TypedRequest<PlanoAcaoInput>, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const {
        beneficiaria_id,
        data_plano,
        objetivo_principal,
        areas_prioritarias,
        outras_areas,
        acoes_realizadas,
        suporte_instituto,
        assinatura_beneficiaria,
        assinatura_responsavel_tecnico
      } = req.body;

      const result = await pool.query<PlanoAcao>(
        `INSERT INTO planos_acao (
          beneficiaria_id, data_plano, objetivo_principal, areas_prioritarias,
          outras_areas, acoes_realizadas, suporte_instituto,
          assinatura_beneficiaria, assinatura_responsavel_tecnico
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          beneficiaria_id,
          data_plano,
          objetivo_principal,
          areas_prioritarias,
          outras_areas,
          acoes_realizadas,
          suporte_instituto,
          assinatura_beneficiaria,
          assinatura_responsavel_tecnico
        ]
      );

      return res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      logger.error('Erro ao criar plano:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async atualizar(req: TypedRequest<PlanoAcaoInput, PlanoAcaoParams>, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const { id } = req.params;
      const {
        data_plano,
        objetivo_principal,
        areas_prioritarias,
        outras_areas,
        acoes_realizadas,
        suporte_instituto,
        primeira_avaliacao_data,
        primeira_avaliacao_progresso,
        segunda_avaliacao_data,
        segunda_avaliacao_progresso,
        assinatura_beneficiaria,
        assinatura_responsavel_tecnico
      } = req.body;

      const result = await pool.query<PlanoAcao>(
        `UPDATE planos_acao
         SET data_plano = $1,
             objetivo_principal = $2,
             areas_prioritarias = $3,
             outras_areas = $4,
             acoes_realizadas = $5,
             suporte_instituto = $6,
             primeira_avaliacao_data = $7,
             primeira_avaliacao_progresso = $8,
             segunda_avaliacao_data = $9,
             segunda_avaliacao_progresso = $10,
             assinatura_beneficiaria = $11,
             assinatura_responsavel_tecnico = $12,
             data_atualizacao = NOW()
         WHERE id = $13
         RETURNING *`,
        [
          data_plano,
          objetivo_principal,
          areas_prioritarias,
          outras_areas,
          acoes_realizadas,
          suporte_instituto,
          primeira_avaliacao_data,
          primeira_avaliacao_progresso,
          segunda_avaliacao_data,
          segunda_avaliacao_progresso,
          assinatura_beneficiaria,
          assinatura_responsavel_tecnico,
          id
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json({ data: result.rows[0] });
    } catch (error) {
      logger.error('Erro ao atualizar plano:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
