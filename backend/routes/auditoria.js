/**
 * Módulo de Auditoria - Registro e consulta de logs de ações no sistema
 * Implementação usando PostgreSQL com índices otimizados
 */

const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');

const router = express.Router();

// Configuração do PostgreSQL com pool de conexões
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Função auxiliar para registrar eventos de auditoria
async function registrarEvento(tipo, descricao, usuario_id, modulo, detalhes = null, ip = null) {
  try {
    const query = `
      INSERT INTO eventos_auditoria 
        (tipo, descricao, usuario_id, modulo, detalhes, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      tipo,
      descricao,
      usuario_id,
      modulo,
      detalhes ? JSON.stringify(detalhes) : null,
      ip
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao registrar evento de auditoria:', error);
    return null;
  }
}

// Listar eventos de auditoria com filtros
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      tipo,
      modulo,
      usuario_id,
      data_inicio,
      data_fim,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;
    let params = [];
    let whereConditions = [];
    let paramCount = 0;

    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo = $${paramCount}`);
      params.push(tipo);
    }

    if (modulo) {
      paramCount++;
      whereConditions.push(`modulo = $${paramCount}`);
      params.push(modulo);
    }

    if (usuario_id) {
      paramCount++;
      whereConditions.push(`usuario_id = $${paramCount}`);
      params.push(usuario_id);
    }

    if (data_inicio && data_fim) {
      paramCount++;
      whereConditions.push(`data_criacao >= $${paramCount}`);
      params.push(data_inicio);
      
      paramCount++;
      whereConditions.push(`data_criacao <= $${paramCount}`);
      params.push(data_fim);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query principal com paginação
    const query = `
      SELECT 
        ea.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM eventos_auditoria ea
      LEFT JOIN usuarios u ON ea.usuario_id = u.id
      ${whereClause}
      ORDER BY ea.data_criacao DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    // Query de contagem total
    const countQuery = `
      SELECT COUNT(*) 
      FROM eventos_auditoria ea
      LEFT JOIN usuarios u ON ea.usuario_id = u.id
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].count);
    const eventos = formatArrayDates(result.rows, ['data_criacao']);

    // Registrar a própria consulta como um evento de auditoria
    await registrarEvento(
      'CONSULTA',
      'Consulta ao log de auditoria',
      req.user.id,
      'auditoria',
      { filtros: req.query },
      req.ip
    );

    res.json(successResponse(eventos, 'Eventos de auditoria carregados com sucesso', {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }));

  } catch (error) {
    console.error('Erro ao buscar eventos de auditoria:', error);
    res.status(500).json(errorResponse('Erro ao buscar eventos de auditoria'));
  }
});

// Obter estatísticas de auditoria
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { periodo = 'ultimos_30_dias' } = req.query;

    let intervalo;
    switch (periodo) {
      case 'hoje':
        intervalo = "data_criacao >= CURRENT_DATE";
        break;
      case 'ultima_semana':
        intervalo = "data_criacao >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'ultimo_mes':
        intervalo = "data_criacao >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        intervalo = "data_criacao >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const query = `
      SELECT 
        COUNT(*) as total_eventos,
        COUNT(DISTINCT usuario_id) as total_usuarios,
        COUNT(DISTINCT modulo) as total_modulos,
        COUNT(DISTINCT ip_address) as total_ips,
        (
          SELECT tipo 
          FROM eventos_auditoria 
          WHERE ${intervalo}
          GROUP BY tipo 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as tipo_mais_comum,
        (
          SELECT modulo 
          FROM eventos_auditoria 
          WHERE ${intervalo}
          GROUP BY modulo 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as modulo_mais_acessado
      FROM eventos_auditoria
      WHERE ${intervalo}
    `;

    const result = await pool.query(query);
    
    // Buscar distribuição por tipo
    const tiposQuery = `
      SELECT tipo, COUNT(*) as total
      FROM eventos_auditoria
      WHERE ${intervalo}
      GROUP BY tipo
      ORDER BY total DESC
    `;

    const modulosQuery = `
      SELECT modulo, COUNT(*) as total
      FROM eventos_auditoria
      WHERE ${intervalo}
      GROUP BY modulo
      ORDER BY total DESC
    `;

    const [tipos, modulos] = await Promise.all([
      pool.query(tiposQuery),
      pool.query(modulosQuery)
    ]);

    const stats = {
      ...result.rows[0],
      distribuicao_tipos: tipos.rows,
      distribuicao_modulos: modulos.rows
    };

    res.json(successResponse(stats, 'Estatísticas de auditoria carregadas com sucesso'));

  } catch (error) {
    console.error('Erro ao buscar estatísticas de auditoria:', error);
    res.status(500).json(errorResponse('Erro ao buscar estatísticas de auditoria'));
  }
});

// Exportar eventos de auditoria (formato CSV)
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data_inicio, data_fim, tipo, modulo } = req.query;

    let whereConditions = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (data_inicio && data_fim) {
      paramCount += 2;
      whereConditions.push(`data_criacao BETWEEN $${paramCount-1} AND $${paramCount}`);
      params.push(data_inicio, data_fim);
    }

    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo = $${paramCount}`);
      params.push(tipo);
    }

    if (modulo) {
      paramCount++;
      whereConditions.push(`modulo = $${paramCount}`);
      params.push(modulo);
    }

    const query = `
      SELECT 
        ea.id,
        ea.tipo,
        ea.descricao,
        ea.modulo,
        ea.detalhes,
        ea.ip_address,
        ea.data_criacao,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM eventos_auditoria ea
      LEFT JOIN usuarios u ON ea.usuario_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ea.data_criacao DESC
    `;

    const result = await pool.query(query, params);
    const eventos = formatArrayDates(result.rows, ['data_criacao']);

    // Converter para CSV
    const campos = ['id', 'tipo', 'descricao', 'modulo', 'usuario_nome', 'usuario_email', 'ip_address', 'data_criacao'];
    const csv = [
      campos.join(','), // cabeçalho
      ...eventos.map(evento => 
        campos.map(campo => 
          JSON.stringify(evento[campo] || '')
        ).join(',')
      )
    ].join('\n');

    // Registrar exportação
    await registrarEvento(
      'EXPORTACAO',
      'Exportação de logs de auditoria',
      req.user.id,
      'auditoria',
      { filtros: req.query },
      req.ip
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Erro ao exportar eventos de auditoria:', error);
    res.status(500).json(errorResponse('Erro ao exportar eventos de auditoria'));
  }
});

// Obter detalhes de um evento específico
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ea.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM eventos_auditoria ea
      LEFT JOIN usuarios u ON ea.usuario_id = u.id
      WHERE ea.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Evento não encontrado'));
    }

    const evento = formatObjectDates(result.rows[0], ['data_criacao']);

    res.json(successResponse(evento, 'Detalhes do evento carregados com sucesso'));

  } catch (error) {
    console.error('Erro ao buscar detalhes do evento:', error);
    res.status(500).json(errorResponse('Erro ao buscar detalhes do evento'));
  }
});

// Exportar função de registro de eventos para uso em outros módulos
module.exports = {
  router,
  registrarEvento
};
