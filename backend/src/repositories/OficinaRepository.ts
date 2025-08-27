import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { Oficina } from '../types/shared';

export class OficinaRepository {
  async listar(params: {
    page?: number;
    limit?: number;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }) {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    try {
      let query = `
        SELECT o.*, 
          COUNT(p.id) as total_presencas,
          COUNT(p.id) FILTER (WHERE p.presente = true) as total_presentes,
          COUNT(*) OVER() as total_count
        FROM oficinas o
        LEFT JOIN oficina_presencas p ON o.id = p.oficina_id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramCount = 1;

      if (params.status) {
        query += ` AND o.status = $${paramCount}`;
        queryParams.push(params.status);
        paramCount++;
      }

      if (params.data_inicio) {
        query += ` AND o.data_oficina >= $${paramCount}`;
        queryParams.push(params.data_inicio);
        paramCount++;
      }

      if (params.data_fim) {
        query += ` AND o.data_oficina <= $${paramCount}`;
        queryParams.push(params.data_fim);
        paramCount++;
      }
      
      query += `
        GROUP BY o.id
        ORDER BY o.data_oficina DESC
        LIMIT $${paramCount} 
        OFFSET $${paramCount + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);
      
      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(result.rows[0]?.total_count || '0')
        }
      };
    } catch (error) {
      logger.error('Erro ao listar oficinas:', error);
      throw error;
    }
  }

  async buscarPorId(id: number) {
    try {
      const query = `
        SELECT o.*, 
          COUNT(p.id) as total_presencas,
          COUNT(p.id) FILTER (WHERE p.presente = true) as total_presentes
        FROM oficinas o
        LEFT JOIN oficina_presencas p ON o.id = p.oficina_id
        WHERE o.id = $1
        GROUP BY o.id
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar oficina:', error);
      throw error;
    }
  }

  async criar(oficina: Partial<Oficina>) {
    try {
      const query = `
        INSERT INTO oficinas (
          titulo, descricao, data_oficina, horario_inicio, horario_fim,
          instrutor, local, capacidade_maxima, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        oficina.titulo,
        oficina.descricao,
        oficina.data_oficina,
        oficina.horario_inicio,
        oficina.horario_fim,
        oficina.instrutor,
        oficina.local,
        oficina.capacidade_maxima,
        oficina.status || 'agendada'
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao criar oficina:', error);
      throw error;
    }
  }

  async atualizar(id: number, oficina: Partial<Oficina>) {
    try {
      const fieldsToUpdate = Object.entries(oficina)
        .filter(([_, value]) => value !== undefined)
        .map(([key], index) => `${key} = $${index + 1}`);

      const query = `
        UPDATE oficinas 
        SET ${fieldsToUpdate.join(', ')}
        WHERE id = $${fieldsToUpdate.length + 1}
        RETURNING *
      `;

      const values = [...Object.values(oficina).filter(v => v !== undefined), id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao atualizar oficina:', error);
      throw error;
    }
  }

  async excluir(id: number) {
    try {
      await pool.query('DELETE FROM oficinas WHERE id = $1', [id]);
      return true;
    } catch (error) {
      logger.error('Erro ao excluir oficina:', error);
      throw error;
    }
  }

  async registrarPresenca(oficinaId: number, beneficiariaId: number, presente: boolean, observacoes?: string) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verifica se já existe registro
      const checkQuery = `
        SELECT id FROM oficina_presencas 
        WHERE oficina_id = $1 AND beneficiaria_id = $2
      `;
      const checkResult = await client.query(checkQuery, [oficinaId, beneficiariaId]);

      let result;
      if (checkResult.rows.length > 0) {
        // Atualiza registro existente
        result = await client.query(`
          UPDATE oficina_presencas 
          SET presente = $3, observacoes = $4, data_registro = CURRENT_TIMESTAMP
          WHERE oficina_id = $1 AND beneficiaria_id = $2
          RETURNING *
        `, [oficinaId, beneficiariaId, presente, observacoes]);
      } else {
        // Cria novo registro
        result = await client.query(`
          INSERT INTO oficina_presencas (oficina_id, beneficiaria_id, presente, observacoes)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [oficinaId, beneficiariaId, presente, observacoes]);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erro ao registrar presença:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listarPresencas(oficinaId: number) {
    try {
      const query = `
        SELECT p.*, b.nome as beneficiaria_nome
        FROM oficina_presencas p
        JOIN beneficiarias b ON b.id = p.beneficiaria_id
        WHERE p.oficina_id = $1
        ORDER BY b.nome
      `;

      const result = await pool.query(query, [oficinaId]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao listar presenças:', error);
      throw error;
    }
  }
}
