import { Request, Response } from 'express';
import pool from '../config/database';
import { cacheService } from '../services/cache.service';
import { AppError } from '../utils';
import { matriculasService, MatriculaData } from '../services/matriculas.service';

// Logger personalizado
const log = {
  error: (message: string, error?: any): void => {
    const timestamp = new Date().toISOString();
    const logMessage = error ? `${message}: ${JSON.stringify(error)}` : message;
    // Usar setTimeout para evitar problemas de console em alguns ambientes
    setTimeout(() => {
      if (typeof console !== 'undefined') {
        console.error(`[${timestamp}] ${logMessage}`);
      }
    }, 0);
  },
  info: (message: string): void => {
    const timestamp = new Date().toISOString();
    setTimeout(() => {
      if (typeof console !== 'undefined') {
        console.log(`[${timestamp}] ${message}`);
      }
    }, 0);
  }
};

export const listarMatriculas = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      beneficiaria_id,
      projeto_id,
      status_matricula,
      page = 1,
      limit = 10
    } = req.query;

    const result = await matriculasService.listarMatriculas({
      beneficiariaId: beneficiaria_id ? Number(beneficiaria_id) : undefined,
      projetoId: projeto_id ? Number(projeto_id) : undefined,
      statusMatricula: status_matricula ? String(status_matricula) : undefined,
      page: Number(page),
      limit: Number(limit)
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    log.error('Erro ao listar matrículas', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar matrículas'
    });
  }
};

export const criarMatricula = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data: MatriculaData = req.body;
    const matricula = await matriculasService.criarMatricula(data);

    return res.status(201).json({
      success: true,
      data: matricula,
      message: 'Matrícula criada com sucesso'
    });

  } catch (error) {
    log.error('Erro ao criar matrícula', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao criar matrícula'
    });
  }
};

export const obterMatricula = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        mp.*,
        b.nome_completo as beneficiaria_nome,
        b.cpf as beneficiaria_cpf,
        b.email as beneficiaria_email,
        p.nome as projeto_nome,
        p.descricao as projeto_descricao,
        p.data_inicio as projeto_data_inicio,
        p.data_fim as projeto_data_fim,
        p.responsavel_nome as projeto_responsavel
      FROM matriculas_projetos mp
      JOIN beneficiarias b ON mp.beneficiaria_id = b.id
      JOIN projetos p ON mp.projeto_id = p.id
      WHERE mp.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Matrícula não encontrada'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    log.error('Erro ao obter matrícula', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar matrícula'
    });
  }
};

export const atualizarMatricula = async (req: Request, res: Response): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const data = req.body;

    // Verificar se matrícula existe
    const matriculaCheck = await client.query(
      'SELECT * FROM matriculas_projetos WHERE id = $1',
      [id]
    );

    if (matriculaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Matrícula não encontrada'
      });
    }

    const matriculaAtual = matriculaCheck.rows[0];

    // Se mudando status para aprovada, criar participação
    if (data.status_matricula === 'aprovada' && matriculaAtual.status_matricula !== 'aprovada') {
      await client.query(`
        INSERT INTO participacoes (projeto_id, beneficiaria_id, status, data_inscricao)
        VALUES ($1, $2, 'inscrita', NOW())
        ON CONFLICT (projeto_id, beneficiaria_id) DO NOTHING
      `, [matriculaAtual.projeto_id, matriculaAtual.beneficiaria_id]);

      data.data_aprovacao = new Date().toISOString();
    }

    // Construir query de atualização dinamicamente
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(data).forEach(key => {
      if (key !== 'id' && data[key] !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        if (key === 'disponibilidade_horarios' && Array.isArray(data[key])) {
          values.push(JSON.stringify(data[key]));
        } else {
          values.push(data[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }

    updateFields.push(`updated_at = $${++paramCount}`);
    values.push(new Date().toISOString());

    values.push(id); // Para o WHERE
    const updateQuery = `
      UPDATE matriculas_projetos 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);
    
    await client.query('COMMIT');

    // Limpar cache
    await cacheService.delete(`cache:beneficiaria:${matriculaAtual.beneficiaria_id}`);
    await cacheService.delete(`cache:projeto:${matriculaAtual.projeto_id}`);
    await cacheService.deletePattern('cache:matriculas:*');

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Matrícula atualizada com sucesso'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Erro ao atualizar matrícula', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao atualizar matrícula'
    });
  } finally {
    client.release();
  }
};

export const verificarElegibilidade = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { beneficiaria_id, projeto_id } = req.body;

    const resultado = await matriculasService.verificarElegibilidade(
      Number(beneficiaria_id),
      Number(projeto_id)
    );

    return res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    log.error('Erro ao verificar elegibilidade', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao verificar elegibilidade'
    });
  }
};
