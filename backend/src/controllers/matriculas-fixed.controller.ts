import { Request, Response } from 'express';
import pool from '../config/database';
import redis from '../config/redis';
import { cacheService } from '../services/cache.service';

interface MatriculaData {
  beneficiaria_id: number;
  projeto_id: number;
  data_matricula?: string;
  data_inicio_prevista?: string;
  data_conclusao_prevista?: string;
  situacao_social_familiar?: string;
  escolaridade_atual?: string;
  experiencia_profissional?: string;
  motivacao_participacao: string;
  expectativas: string;
  disponibilidade_horarios?: string[];
  possui_dependentes?: boolean;
  necessita_auxilio_transporte?: boolean;
  necessita_auxilio_alimentacao?: boolean;
  necessita_cuidado_criancas?: boolean;
  atende_criterios_idade?: boolean;
  atende_criterios_renda?: boolean;
  atende_criterios_genero?: boolean;
  atende_criterios_territorio?: boolean;
  atende_criterios_vulnerabilidade?: boolean;
  observacoes_elegibilidade?: string;
  termo_compromisso_assinado?: boolean;
  frequencia_minima_aceita?: boolean;
  regras_convivencia_aceitas?: boolean;
  participacao_atividades_aceita?: boolean;
  avaliacao_periodica_aceita?: boolean;
  como_conheceu_projeto?: string;
  pessoas_referencias?: string;
  condicoes_especiais?: string;
  medicamentos_uso_continuo?: string;
  alergias_restricoes?: string;
  profissional_matricula?: string;
  observacoes_profissional?: string;
  status_matricula?: 'pendente' | 'aprovada' | 'reprovada' | 'lista_espera';
  motivo_status?: string;
  data_aprovacao?: string;
}

interface ElegibilidadeResult {
  elegivel: boolean;
  motivos: string[];
  warnings: string[];
  matricula_existente?: any;
}

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
      status_matricula = 'pendente',
      page = 1, 
      limit = 10 
    } = req.query;

    let query = `
      SELECT 
        mp.*,
        b.nome_completo as beneficiaria_nome,
        b.cpf as beneficiaria_cpf,
        p.nome as projeto_nome,
        p.descricao as projeto_descricao,
        p.data_inicio as projeto_data_inicio,
        p.data_fim as projeto_data_fim
      FROM matriculas_projetos mp
      JOIN beneficiarias b ON mp.beneficiaria_id = b.id
      JOIN projetos p ON mp.projeto_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (beneficiaria_id) {
      query += ` AND mp.beneficiaria_id = $${++paramCount}`;
      params.push(beneficiaria_id);
    }

    if (projeto_id) {
      query += ` AND mp.projeto_id = $${++paramCount}`;
      params.push(projeto_id);
    }

    if (status_matricula) {
      query += ` AND mp.status_matricula = $${++paramCount}`;
      params.push(status_matricula);
    }

    query += ` ORDER BY mp.data_matricula DESC`;

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    // Limpar cache quando listar
    await cacheService.deletePattern('cache:matriculas:*');

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    log.error('Erro ao listar matrículas', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar matrículas'
    });
  }
};

export const criarMatricula = async (req: Request, res: Response): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const data: MatriculaData = req.body;

    // Verificar se beneficiária existe
    const beneficiariaCheck = await client.query(
      'SELECT id FROM beneficiarias WHERE id = $1',
      [data.beneficiaria_id]
    );

    if (beneficiariaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Beneficiária não encontrada'
      });
    }

    // Verificar se projeto existe e está ativo
    const projetoCheck = await client.query(
      'SELECT id, status FROM projetos WHERE id = $1',
      [data.projeto_id]
    );

    if (projetoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    if (projetoCheck.rows[0].status !== 'ativo') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Projeto não está ativo para novas matrículas'
      });
    }

    // Verificar se já existe matrícula
    const matriculaExistente = await client.query(`
      SELECT id FROM matriculas_projetos 
      WHERE beneficiaria_id = $1 AND projeto_id = $2
    `, [data.beneficiaria_id, data.projeto_id]);

    if (matriculaExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Beneficiária já possui matrícula neste projeto'
      });
    }

    // Tabela garantida via migrations (031_criar_matriculas_projetos.sql)

    // Inserir a matrícula
    const insertQuery = `
      INSERT INTO matriculas_projetos (
        beneficiaria_id, projeto_id, data_matricula, data_inicio_prevista, 
        data_conclusao_prevista, situacao_social_familiar, escolaridade_atual,
        experiencia_profissional, motivacao_participacao, expectativas,
        disponibilidade_horarios, possui_dependentes, necessita_auxilio_transporte,
        necessita_auxilio_alimentacao, necessita_cuidado_criancas,
        atende_criterios_idade, atende_criterios_renda, atende_criterios_genero,
        atende_criterios_territorio, atende_criterios_vulnerabilidade,
        observacoes_elegibilidade, termo_compromisso_assinado, frequencia_minima_aceita,
        regras_convivencia_aceitas, participacao_atividades_aceita,
        avaliacao_periodica_aceita, como_conheceu_projeto, pessoas_referencias,
        condicoes_especiais, medicamentos_uso_continuo, alergias_restricoes,
        profissional_matricula, observacoes_profissional, status_matricula,
        motivo_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35
      ) RETURNING *
    `;

    const values = [
      data.beneficiaria_id,
      data.projeto_id,
      data.data_matricula || new Date().toISOString().split('T')[0],
      data.data_inicio_prevista,
      data.data_conclusao_prevista,
      data.situacao_social_familiar,
      data.escolaridade_atual,
      data.experiencia_profissional,
      data.motivacao_participacao,
      data.expectativas,
      JSON.stringify(data.disponibilidade_horarios || []),
      data.possui_dependentes || false,
      data.necessita_auxilio_transporte || false,
      data.necessita_auxilio_alimentacao || false,
      data.necessita_cuidado_criancas || false,
      data.atende_criterios_idade !== false,
      data.atende_criterios_renda !== false,
      data.atende_criterios_genero !== false,
      data.atende_criterios_territorio !== false,
      data.atende_criterios_vulnerabilidade !== false,
      data.observacoes_elegibilidade,
      data.termo_compromisso_assinado || false,
      data.frequencia_minima_aceita || false,
      data.regras_convivencia_aceitas || false,
      data.participacao_atividades_aceita || false,
      data.avaliacao_periodica_aceita || false,
      data.como_conheceu_projeto,
      data.pessoas_referencias,
      data.condicoes_especiais,
      data.medicamentos_uso_continuo,
      data.alergias_restricoes,
      data.profissional_matricula,
      data.observacoes_profissional,
      data.status_matricula || 'pendente',
      data.motivo_status
    ];

    const matriculaResult = await client.query(insertQuery, values);
    const matricula = matriculaResult.rows[0];

    // Se aprovada automaticamente, criar participação
    if (data.status_matricula === 'aprovada') {
      await client.query(`
        INSERT INTO participacoes (projeto_id, beneficiaria_id, status, data_inscricao)
        VALUES ($1, $2, 'inscrita', NOW())
        ON CONFLICT (projeto_id, beneficiaria_id) DO NOTHING
      `, [data.projeto_id, data.beneficiaria_id]);

      await client.query(`
        UPDATE matriculas_projetos 
        SET data_aprovacao = NOW() 
        WHERE id = $1
      `, [matricula.id]);
    }

    await client.query('COMMIT');

    // Limpar cache
    await cacheService.delete(`cache:beneficiaria:${data.beneficiaria_id}`);
    await cacheService.delete(`cache:projeto:${data.projeto_id}`);
    await cacheService.deletePattern('cache:matriculas:*');

    return res.status(201).json({
      success: true,
      data: matricula,
      message: 'Matrícula criada com sucesso'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Erro ao criar matrícula', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao criar matrícula'
    });
  } finally {
    client.release();
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

    // Verificar se beneficiária existe
    const beneficiaria = await pool.query(
      'SELECT * FROM beneficiarias WHERE id = $1',
      [beneficiaria_id]
    );

    if (beneficiaria.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiária não encontrada'
      });
    }

    // Verificar se projeto existe
    const projeto = await pool.query(
      'SELECT * FROM projetos WHERE id = $1',
      [projeto_id]
    );

    if (projeto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    // Verificar se já tem matrícula
    const matriculaExistente = await pool.query(
      'SELECT id, status_matricula FROM matriculas_projetos WHERE beneficiaria_id = $1 AND projeto_id = $2',
      [beneficiaria_id, projeto_id]
    );

    const resultado: ElegibilidadeResult = {
      elegivel: true,
      motivos: [],
      warnings: [],
      matricula_existente: matriculaExistente.rows.length > 0 ? matriculaExistente.rows[0] : null
    };

    // Verificações básicas
    if (projeto.rows[0].status !== 'ativo') {
      resultado.elegivel = false;
      resultado.motivos.push('Projeto não está ativo para novas matrículas');
    }

    if (matriculaExistente.rows.length > 0) {
      resultado.elegivel = false;
      resultado.motivos.push('Beneficiária já possui matrícula neste projeto');
    }

    return res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    log.error('Erro ao verificar elegibilidade', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao verificar elegibilidade'
    });
  }
};
