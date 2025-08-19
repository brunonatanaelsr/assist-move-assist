import { Pool } from 'pg';
import { Beneficiaria, BeneficiariaFiltros } from '../types/beneficiarias';
import { AppError } from '../utils/AppError';
import { createPaginatedResponse, PaginatedResponse, PaginationParams } from '../utils/pagination';

export class BeneficiariasRepository {
  constructor(private pool: Pool) {}

  async criar(beneficiaria: Omit<Beneficiaria, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Beneficiaria> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [novaBeneficiaria] } = await client.query(`
        INSERT INTO beneficiarias (
          nome_completo, data_nascimento, cpf, rg, telefone, email,
          estado_civil, num_filhos, escolaridade, profissao, renda_familiar,
          status, foto_url, observacoes, ativo, usuario_criacao, usuario_atualizacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        beneficiaria.nome_completo,
        beneficiaria.data_nascimento,
        beneficiaria.cpf,
        beneficiaria.rg,
        beneficiaria.telefone,
        beneficiaria.email,
        beneficiaria.estado_civil,
        beneficiaria.num_filhos,
        beneficiaria.escolaridade,
        beneficiaria.profissao,
        beneficiaria.renda_familiar,
        beneficiaria.status,
        beneficiaria.foto_url,
        beneficiaria.observacoes,
        beneficiaria.ativo,
        beneficiaria.usuario_criacao,
        beneficiaria.usuario_atualizacao
      ]);

      if (beneficiaria.endereco) {
        await client.query(`
          INSERT INTO enderecos_beneficiarias (
            beneficiaria_id, cep, logradouro, numero, complemento,
            bairro, cidade, estado
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          novaBeneficiaria.id,
          beneficiaria.endereco.cep,
          beneficiaria.endereco.logradouro,
          beneficiaria.endereco.numero,
          beneficiaria.endereco.complemento,
          beneficiaria.endereco.bairro,
          beneficiaria.endereco.cidade,
          beneficiaria.endereco.estado
        ]);
      }

      await client.query('COMMIT');
      return novaBeneficiaria;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        if (error.message.includes('beneficiarias_cpf_key')) {
          throw new AppError('CPF já cadastrado', 409);
        }
        if (error.message.includes('beneficiarias_email_key')) {
          throw new AppError('Email já cadastrado', 409);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async atualizar(
    id: number,
    beneficiaria: Partial<Omit<Beneficiaria, 'id' | 'data_criacao' | 'data_atualizacao'>>,
    usuarioAtualizacao: number
  ): Promise<Beneficiaria> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(beneficiaria).forEach(([key, value]) => {
        if (value !== undefined && key !== 'endereco') {
          setClauses.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      setClauses.push(`usuario_atualizacao = $${paramCount}`);
      values.push(usuarioAtualizacao);
      paramCount++;
      setClauses.push(`data_atualizacao = CURRENT_TIMESTAMP`);

      values.push(id);

      const { rows: [beneficiariaAtualizada] } = await client.query(`
        UPDATE beneficiarias
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (!beneficiariaAtualizada) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      if (beneficiaria.endereco) {
        await client.query(`
          UPDATE enderecos_beneficiarias
          SET cep = $1, logradouro = $2, numero = $3, complemento = $4,
              bairro = $5, cidade = $6, estado = $7
          WHERE beneficiaria_id = $8
        `, [
          beneficiaria.endereco.cep,
          beneficiaria.endereco.logradouro,
          beneficiaria.endereco.numero,
          beneficiaria.endereco.complemento,
          beneficiaria.endereco.bairro,
          beneficiaria.endereco.cidade,
          beneficiaria.endereco.estado,
          id
        ]);
      }

      await client.query('COMMIT');
      return beneficiariaAtualizada;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        if (error.message.includes('beneficiarias_cpf_key')) {
          throw new AppError('CPF já cadastrado', 409);
        }
        if (error.message.includes('beneficiarias_email_key')) {
          throw new AppError('Email já cadastrado', 409);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async buscarPorId(id: number): Promise<Beneficiaria> {
    const { rows: [beneficiaria] } = await this.pool.query(`
      SELECT b.*, 
             e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado
      FROM beneficiarias b
      LEFT JOIN enderecos_beneficiarias e ON b.id = e.beneficiaria_id
      WHERE b.id = $1 AND b.ativo = true
    `, [id]);

    if (!beneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    return {
      ...beneficiaria,
      endereco: beneficiaria.cep ? {
        cep: beneficiaria.cep,
        logradouro: beneficiaria.logradouro,
        numero: beneficiaria.numero,
        complemento: beneficiaria.complemento,
        bairro: beneficiaria.bairro,
        cidade: beneficiaria.cidade,
        estado: beneficiaria.estado
      } : undefined
    };
  }

  async listar(
    filtros: BeneficiariaFiltros,
    paginacao: PaginationParams
  ): Promise<PaginatedResponse<Beneficiaria>> {
    const conditions: string[] = ['b.ativo = true'];
    const values: any[] = [];
    let paramCount = 1;

    if (filtros.search) {
      conditions.push(`(
        b.nome_completo ILIKE $${paramCount} OR
        b.cpf ILIKE $${paramCount} OR
        b.email ILIKE $${paramCount}
      )`);
      values.push(`%${filtros.search}%`);
      paramCount++;
    }

    if (filtros.status) {
      conditions.push(`b.status = $${paramCount}`);
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros.data_inicio) {
      conditions.push(`b.data_criacao >= $${paramCount}`);
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros.data_fim) {
      conditions.push(`b.data_criacao <= $${paramCount}`);
      values.push(filtros.data_fim);
      paramCount++;
    }

    if (filtros.escolaridade) {
      conditions.push(`b.escolaridade = $${paramCount}`);
      values.push(filtros.escolaridade);
      paramCount++;
    }

    if (filtros.renda_min !== undefined) {
      conditions.push(`b.renda_familiar >= $${paramCount}`);
      values.push(filtros.renda_min);
      paramCount++;
    }

    if (filtros.renda_max !== undefined) {
      conditions.push(`b.renda_familiar <= $${paramCount}`);
      values.push(filtros.renda_max);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: beneficiarias, rowCount } = await this.pool.query(`
      SELECT b.*, 
             e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado,
             COUNT(*) OVER() as total_count
      FROM beneficiarias b
      LEFT JOIN enderecos_beneficiarias e ON b.id = e.beneficiaria_id
      ${whereClause}
      ORDER BY b.nome_completo
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...values, paginacao.limit, paginacao.offset]);

    const items = beneficiarias.map(b => ({
      ...b,
      endereco: b.cep ? {
        cep: b.cep,
        logradouro: b.logradouro,
        numero: b.numero,
        complemento: b.complemento,
        bairro: b.bairro,
        cidade: b.cidade,
        estado: b.estado
      } : undefined
    }));

    return createPaginatedResponse(items, rowCount, paginacao);
  }

  async excluir(id: number): Promise<void> {
    const { rowCount } = await this.pool.query(`
      UPDATE beneficiarias
      SET ativo = false
      WHERE id = $1 AND ativo = true
    `, [id]);

    if (rowCount === 0) {
      throw new AppError('Beneficiária não encontrada', 404);
    }
  }

  async buscarResumo(id: number): Promise<BeneficiariaResumo> {
    const { rows: [resumo] } = await this.pool.query(`
      SELECT 
        b.id,
        b.nome_completo,
        b.cpf,
        b.telefone,
        b.status,
        COUNT(DISTINCT p.id) as projetos_ativos,
        COUNT(DISTINCT o.id) as oficinas_mes,
        MAX(f.data_preenchimento) as ultimo_formulario
      FROM beneficiarias b
      LEFT JOIN beneficiarias_projetos bp ON b.id = bp.beneficiaria_id
      LEFT JOIN projetos p ON bp.projeto_id = p.id AND p.status = 'ativo'
      LEFT JOIN presencas_oficinas po ON b.id = po.beneficiaria_id
      LEFT JOIN oficinas o ON po.oficina_id = o.id 
        AND o.data >= DATE_TRUNC('month', CURRENT_DATE)
      LEFT JOIN formularios_preenchidos f ON b.id = f.beneficiaria_id
      WHERE b.id = $1 AND b.ativo = true
      GROUP BY b.id, b.nome_completo, b.cpf, b.telefone, b.status
    `, [id]);

    if (!resumo) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    return resumo;
  }
}
