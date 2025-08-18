const { db } = require('../services/db');
const { loggerService } = require('../services/logger');
const { validateBeneficiaria } = require('../validators/beneficiaria.validator');
const { AppError } = require('../middleware/errorHandler');

class BeneficiariaService {
  async listar({ search, status, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM beneficiarias WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome_completo ILIKE $${params.length} OR cpf ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const beneficiarias = await db.query(query, params);
    const total = await this.contar({ search, status });

    return {
      beneficiarias,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async contar({ search, status }) {
    let query = 'SELECT COUNT(*) as total FROM beneficiarias WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome_completo ILIKE $${params.length} OR cpf ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    const result = await db.query(query, params);
    return parseInt(result[0].total);
  }

  async buscarPorId(id) {
    const beneficiaria = await db.findById('beneficiarias', id);
    if (!beneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }
    return beneficiaria;
  }

  async criar(dados, usuarioId) {
    // Validar dados
    const { error, value } = validateBeneficiaria(dados);
    if (error) {
      throw new AppError(error.details.map(d => d.message).join(', '), 400);
    }

    // Verificar CPF duplicado
    const existente = await db.query(
      'SELECT id FROM beneficiarias WHERE cpf = $1',
      [value.cpf]
    );
    if (existente.length > 0) {
      throw new AppError('CPF já cadastrado', 409);
    }

    // Criar beneficiária
    const beneficiaria = await db.insert('beneficiarias', {
      ...value,
      created_by: usuarioId,
      created_at: new Date(),
      updated_at: new Date()
    });

    loggerService.audit('BENEFICIARIA_CREATED', usuarioId, {
      beneficiaria_id: beneficiaria.id,
      nome_completo: value.nome_completo
    });

    return beneficiaria;
  }

  async atualizar(id, dados, usuarioId) {
    // Validar dados
    const { error, value } = validateBeneficiaria(dados);
    if (error) {
      throw new AppError(error.details.map(d => d.message).join(', '), 400);
    }

    // Verificar se existe
    const existente = await this.buscarPorId(id);

    // Verificar CPF duplicado se estiver alterando
    if (value.cpf && value.cpf !== existente.cpf) {
      const cpfExiste = await db.query(
        'SELECT id FROM beneficiarias WHERE cpf = $1 AND id != $2',
        [value.cpf, id]
      );
      if (cpfExiste.length > 0) {
        throw new AppError('CPF já está em uso por outra beneficiária', 409);
      }
    }

    // Atualizar
    const beneficiaria = await db.update('beneficiarias', id, {
      ...value,
      updated_at: new Date(),
      updated_by: usuarioId
    });

    loggerService.audit('BENEFICIARIA_UPDATED', usuarioId, {
      beneficiaria_id: id,
      changes: Object.keys(value)
    });

    return beneficiaria;
  }

  async excluir(id, usuarioId) {
    // Verificar se existe
    const beneficiaria = await this.buscarPorId(id);

    // Soft delete
    await db.update('beneficiarias', id, {
      status: 'inativa',
      deleted_at: new Date(),
      deleted_by: usuarioId
    });

    loggerService.audit('BENEFICIARIA_DELETED', usuarioId, {
      beneficiaria_id: id,
      nome_completo: beneficiaria.nome_completo
    });

    return true;
  }

  async buscarAnamneses(id) {
    const anamneses = await db.query(
      `SELECT a.*, u.nome as profissional_nome 
       FROM anamneses_social a
       LEFT JOIN usuarios u ON a.created_by = u.id
       WHERE a.beneficiaria_id = $1 
       ORDER BY a.created_at DESC`,
      [id]
    );
    return anamneses;
  }

  async buscarDeclaracoes(id) {
    const declaracoes = await db.query(
      `SELECT d.*, u.nome as profissional_nome 
       FROM declaracoes_comparecimento d
       LEFT JOIN usuarios u ON d.created_by = u.id
       WHERE d.beneficiaria_id = $1 
       ORDER BY d.created_at DESC`,
      [id]
    );
    return declaracoes;
  }

  async buscarHistoricoCompleto(id) {
    // Buscar beneficiária
    const beneficiaria = await this.buscarPorId(id);

    // Buscar todas as informações relacionadas
    const [anamneses, declaracoes, atendimentos, oficinas] = await Promise.all([
      this.buscarAnamneses(id),
      this.buscarDeclaracoes(id),
      db.query(
        `SELECT a.*, u.nome as profissional_nome 
         FROM atendimentos a
         LEFT JOIN usuarios u ON a.profissional_id = u.id
         WHERE a.beneficiaria_id = $1 
         ORDER BY a.data_atendimento DESC`,
        [id]
      ),
      db.query(
        `SELECT o.*, p.presenca, p.observacoes as participacao_observacoes
         FROM oficinas o
         INNER JOIN participacoes p ON o.id = p.oficina_id
         WHERE p.beneficiaria_id = $1 
         ORDER BY o.data_inicio DESC`,
        [id]
      )
    ]);

    return {
      beneficiaria,
      anamneses,
      declaracoes,
      atendimentos,
      oficinas
    };
  }
}

module.exports = new BeneficiariaService();
