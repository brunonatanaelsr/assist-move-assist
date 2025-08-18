const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
});

// Dashboard geral
router.get('/', authenticateToken, async (req, res) => {
  console.log('=== DASHBOARD ENDPOINT INICIADO ===');
  
  try {
    console.log('Iniciando consultas completas...');
    
    // Totais gerais com tratamento de erro para cada query
    let beneficiariasTotal = { rows: [{ count: 0 }] };
    let oficinasTotalResult = { rows: [{ count: 0 }] };
    let projetosTotalResult = { rows: [{ count: 0 }] };
    let participacoesTotalResult = { rows: [{ count: 0 }] };

    try {
      beneficiariasTotal = await pool.query('SELECT COUNT(*) FROM beneficiarias WHERE ativo = true');
    } catch (err) {
      console.error('Erro ao contar beneficiárias:', err);
    }

    try {
      oficinasTotalResult = await pool.query('SELECT COUNT(*) FROM oficinas WHERE ativo = true');
    } catch (err) {
      console.error('Erro ao contar oficinas:', err);
    }

    try {
      projetosTotalResult = await pool.query('SELECT COUNT(*) FROM projetos WHERE ativo = true');
    } catch (err) {
      console.error('Erro ao contar projetos:', err);
    }

    try {
      participacoesTotalResult = await pool.query('SELECT COUNT(*) FROM participacoes WHERE ativo = true');
    } catch (err) {
      console.error('Erro ao contar participações:', err);
    }

    // Estatísticas de status com tratamento de erro
    let beneficiariasStatus = [];
    try {
      const beneficiariasStatusResult = await pool.query(`
        SELECT 
          CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as status,
          COUNT(*) as total
        FROM beneficiarias 
        GROUP BY ativo
        ORDER BY ativo DESC
      `);
      beneficiariasStatus = beneficiariasStatusResult.rows;
    } catch (err) {
      console.error('Erro ao buscar status das beneficiárias:', err);
    }

    // Oficinas por status com tratamento de erro
    let oficinasStatus = [];
    try {
      const oficinasStatusResult = await pool.query(`
        SELECT 
          COALESCE(status_detalhado, 'Sem status') as status,
          COUNT(*) as total
        FROM oficinas 
        WHERE ativo = true
        GROUP BY status_detalhado
        ORDER BY COUNT(*) DESC
      `);
      oficinasStatus = oficinasStatusResult.rows;
    } catch (err) {
      console.error('Erro ao buscar status das oficinas:', err);
    }

    // Dados do dashboard
    const dashboardData = {
      totais: {
        beneficiarias: parseInt(beneficiariasTotal.rows[0].count || 0),
        oficinas: parseInt(oficinasTotalResult.rows[0].count || 0),
        projetos: parseInt(projetosTotalResult.rows[0].count || 0),
        participacoes: parseInt(participacoesTotalResult.rows[0].count || 0)
      },
      beneficiarias_status: beneficiariasStatus,
      oficinas_status: oficinasStatus,
      timestamp: new Date().toISOString()
    };

    res.json(successResponse(dashboardData, "Dashboard carregado com sucesso"));

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json(errorResponse("Erro ao carregar dashboard"));
  }
});

// Endpoint para estatísticas
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let stats = {
      totalBeneficiarias: 0,
      atendimentosMes: 0,
      participacoesAtivas: 0,
      engajamento: "0%",
      formularios: 0
    };

    // Total de beneficiárias
    try {
      const beneficiariasResult = await pool.query(
        'SELECT COUNT(*) as count FROM beneficiarias WHERE ativo = true'
      );
      stats.totalBeneficiarias = parseInt(beneficiariasResult.rows[0].count);
    } catch (err) {
      console.error('Erro ao contar beneficiárias:', err);
    }

    // Atendimentos este mês
    try {
      const atendimentosResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM participacoes 
        WHERE ativo = true 
        AND DATE_TRUNC('month', data_inscricao) = DATE_TRUNC('month', CURRENT_DATE)
      `);
      stats.atendimentosMes = parseInt(atendimentosResult.rows[0].count);
    } catch (err) {
      console.error('Erro ao contar atendimentos:', err);
    }

    // Participações ativas
    try {
      const participacoesResult = await pool.query(
        'SELECT COUNT(*) as count FROM participacoes WHERE ativo = true'
      );
      stats.participacoesAtivas = parseInt(participacoesResult.rows[0].count);
    } catch (err) {
      console.error('Erro ao contar participações:', err);
    }

    // Contagem de formulários
    try {
      const formulariosResult = await pool.query(
        'SELECT COUNT(*) as count FROM anamnese WHERE ativo = true'
      );
      stats.formularios = parseInt(formulariosResult.rows[0].count);
    } catch (err) {
      console.error('Erro ao contar formulários:', err);
    }

    // Calcular engajamento
    if (stats.totalBeneficiarias > 0) {
      const engajamento = (stats.participacoesAtivas / stats.totalBeneficiarias) * 100;
      stats.engajamento = `${Math.round(engajamento)}%`;
    }

    res.json(successResponse(stats, "Estatísticas carregadas com sucesso"));
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json(errorResponse('Erro ao carregar estatísticas'));
  }
});

// Endpoint para atividades recentes
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const activities = [];

    // Beneficiárias cadastradas recentemente
    try {
      const recentBeneficiarias = await pool.query(`
        SELECT nome_completo, data_cadastro 
        FROM beneficiarias 
        WHERE ativo = true
        ORDER BY data_cadastro DESC 
        LIMIT 3
      `);

      recentBeneficiarias.rows.forEach(beneficiaria => {
        activities.push({
          id: `beneficiaria-${beneficiaria.nome_completo}`,
          type: "Nova beneficiária",
          description: `${beneficiaria.nome_completo} foi cadastrada no sistema`,
          time: beneficiaria.data_cadastro || new Date().toISOString(),
          icon: "Users"
        });
      });
    } catch (err) {
      console.error('Erro ao buscar beneficiárias recentes:', err);
    }

    // Participações recentes
    try {
      const recentParticipacoes = await pool.query(`
        SELECT p.*, b.nome_completo, o.nome as oficina_nome
        FROM participacoes p
        JOIN beneficiarias b ON p.beneficiaria_id = b.id
        JOIN oficinas o ON p.oficina_id = o.id
        WHERE p.ativo = true AND b.ativo = true
        ORDER BY p.data_inscricao DESC 
        LIMIT 3
      `);

      recentParticipacoes.rows.forEach(participacao => {
        activities.push({
          id: `participacao-${participacao.id}`,
          type: "Nova participação",
          description: `${participacao.nome_completo} - ${participacao.oficina_nome}`,
          time: participacao.data_inscricao || new Date().toISOString(),
          icon: "Calendar"
        });
      });
    } catch (err) {
      console.error('Erro ao buscar participações recentes:', err);
    }

    // Ordenar por data mais recente
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json(successResponse(activities.slice(0, 5), "Atividades carregadas com sucesso"));
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json(errorResponse('Erro ao carregar atividades'));
  }
});

// Endpoint para tarefas pendentes
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = [];

    // Verificar beneficiárias sem atividades recentes
    try {
      const beneficiariasSemAtividades = await pool.query(`
        SELECT COUNT(*) as count 
        FROM beneficiarias b
        WHERE b.ativo = true AND NOT EXISTS (
          SELECT 1 FROM participacoes p 
          WHERE p.beneficiaria_id = b.id 
          AND p.data_inscricao >= CURRENT_DATE - INTERVAL '30 days'
        )
      `);

      if (parseInt(beneficiariasSemAtividades.rows[0].count) > 0) {
        tasks.push({
          id: 'review-beneficiarias',
          title: `${beneficiariasSemAtividades.rows[0].count} beneficiárias sem atividades recentes`,
          due: 'Hoje',
          priority: 'Alta'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar beneficiárias sem atividades:', err);
    }

    // Verificar oficinas com vagas disponíveis
    try {
      const oficinasComVagas = await pool.query(`
        SELECT COUNT(*) as count 
        FROM oficinas o
        WHERE o.ativo = true 
        AND o.status_detalhado != 'concluida'
        AND o.vagas_total > (
          SELECT COUNT(*) FROM participacoes p 
          WHERE p.oficina_id = o.id AND p.ativo = true
        )
      `);

      if (parseInt(oficinasComVagas.rows[0].count) > 0) {
        tasks.push({
          id: 'oficinas-vagas',
          title: `${oficinasComVagas.rows[0].count} oficinas com vagas disponíveis`,
          due: 'Esta semana',
          priority: 'Média'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar oficinas com vagas:', err);
    }

    // Se não há tarefas, adicionar mensagem padrão
    if (tasks.length === 0) {
      tasks.push({
        id: 'all-good',
        title: 'Tudo em ordem por aqui!',
        due: 'Agora',
        priority: 'Baixa'
      });
    }

    res.json(successResponse(tasks, "Tarefas carregadas com sucesso"));
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json(errorResponse('Erro ao carregar tarefas'));
  }
});

module.exports = router;
