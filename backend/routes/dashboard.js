const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Dashboard geral
router.get('/', authenticateToken, async (req, res) => {
  console.log('=== DASHBOARD ENDPOINT INICIADO ===');
  
  try {
    console.log('Iniciando consultas completas...');
    
    // Totais gerais
    const [beneficiariasTotal, oficinasTotalResult, projetosTotalResult, participacoesTotalResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM beneficiarias'),
      pool.query('SELECT COUNT(*) FROM oficinas'),
      pool.query('SELECT COUNT(*) FROM projetos'),
      pool.query('SELECT COUNT(*) FROM participacoes')
    ]);

    // Beneficiárias por status
    const beneficiariasStatus = await pool.query(`
      SELECT 
        CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as status,
        COUNT(*) as total
      FROM beneficiarias 
      GROUP BY ativo
      ORDER BY ativo DESC
    `);

    // Oficinas por status (se existirem)
    let oficinasStatus = [];
    try {
      const oficinasStatusResult = await pool.query(`
        SELECT 
          CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as status,
          COUNT(*) as total
        FROM oficinas 
        GROUP BY ativo
        ORDER BY ativo DESC
      `);
      oficinasStatus = oficinasStatusResult.rows;
    } catch (err) {
      console.log('Tabela oficinas sem dados ou erro:', err.message);
    }

    // Projetos por status
    let projetosStatus = [];
    try {
      const projetosStatusResult = await pool.query(`
        SELECT 
          CASE WHEN ativo = true THEN 'Ativo' ELSE 'Inativo' END as status,
          COUNT(*) as total
        FROM projetos 
        GROUP BY ativo
        ORDER BY ativo DESC
      `);
      projetosStatus = projetosStatusResult.rows;
    } catch (err) {
      console.log('Erro ao buscar projetos por status:', err.message);
    }

    // Estatísticas de participação
    let estatisticasParticipacao = {
      totalParticipacoes: 0,
      participacoesAtivas: 0,
      beneficiariasComParticipacao: 0
    };

    try {
      const [participacoesAtivasResult, beneficiariasComParticipacaoResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM participacoes WHERE ativo = true'),
        pool.query('SELECT COUNT(DISTINCT beneficiaria_id) FROM participacoes WHERE ativo = true')
      ]);

      estatisticasParticipacao = {
        totalParticipacoes: parseInt(participacoesTotalResult.rows[0].count),
        participacoesAtivas: parseInt(participacoesAtivasResult.rows[0].count),
        beneficiariasComParticipacao: parseInt(beneficiariasComParticipacaoResult.rows[0].count)
      };
    } catch (err) {
      console.log('Erro ao buscar estatísticas de participação:', err.message);
    }

    const dashboardData = {
      totais: {
        beneficiarias: parseInt(beneficiariasTotal.rows[0].count),
        oficinas: parseInt(oficinasTotalResult.rows[0].count),
        projetos: parseInt(projetosTotalResult.rows[0].count),
        participacoes: parseInt(participacoesTotalResult.rows[0].count)
      },
      beneficiarias_status: beneficiariasStatus.rows,
      oficinas_status: oficinasStatus,
      projetos_status: projetosStatus,
      estatisticas_participacao: estatisticasParticipacao,
      timestamp: new Date().toISOString()
    };

    console.log('Dashboard data completo:', JSON.stringify(dashboardData, null, 2));
    res.json(successResponse(dashboardData, "Dashboard carregado com sucesso"));

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json(errorResponse("Erro ao carregar dashboard"));
  }
});

// Endpoint para estatísticas do dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Total de beneficiárias
    const totalBeneficiarias = await pool.query('SELECT COUNT(*) as count FROM beneficiarias WHERE ativo = true');
    
    // Total de formulários (declarações de comparecimento)
    const totalFormularios = await pool.query('SELECT COUNT(*) as count FROM declaracoes_comparecimento');
    
    // Atendimentos este mês
    const atendimentosMes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM declaracoes_comparecimento 
      WHERE DATE_TRUNC('month', data_criacao) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    // Participações em oficinas para calcular engajamento
    const totalParticipacoes = await pool.query('SELECT COUNT(*) as count FROM participacoes WHERE ativo = true');
    const totalOficinas = await pool.query('SELECT COUNT(*) as count FROM oficinas WHERE ativo = true');
    
    // Calcular taxa de engajamento
    const participacoes = parseInt(totalParticipacoes.rows[0].count);
    const oficinas = parseInt(totalOficinas.rows[0].count);
    const beneficiarias = parseInt(totalBeneficiarias.rows[0].count);
    
    let engajamento = 0;
    if (beneficiarias > 0 && oficinas > 0) {
      engajamento = Math.round((participacoes / (beneficiarias * oficinas)) * 100);
    } else if (beneficiarias > 0) {
      engajamento = Math.round((participacoes / beneficiarias) * 100);
    }

    const stats = {
      totalBeneficiarias: parseInt(totalBeneficiarias.rows[0].count),
      formularios: parseInt(totalFormularios.rows[0].count),
      atendimentosMes: parseInt(atendimentosMes.rows[0].count),
      engajamento: `${engajamento}%`
    };

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
    const recentBeneficiarias = await pool.query(`
      SELECT nome_completo, data_criacao 
      FROM beneficiarias 
      WHERE ativo = true
      ORDER BY data_criacao DESC 
      LIMIT 3
    `);

    recentBeneficiarias.rows.forEach(beneficiaria => {
      activities.push({
        id: `beneficiaria-${beneficiaria.nome_completo}`,
        type: "Nova beneficiária",
        description: `${beneficiaria.nome_completo} foi cadastrada no sistema`,
        time: beneficiaria.data_criacao || new Date().toISOString(),
        icon: "Users"
      });
    });

    // Declarações emitidas recentemente (se existir a tabela)
    try {
      const recentDeclaracoes = await pool.query(`
        SELECT d.*, b.nome_completo 
        FROM declaracoes_comparecimento d
        JOIN beneficiarias b ON d.beneficiaria_id = b.id
        WHERE b.ativo = true
        ORDER BY d.data_criacao DESC 
        LIMIT 3
      `);

      recentDeclaracoes.rows.forEach(declaracao => {
        activities.push({
          id: `declaracao-${declaracao.id}`,
          type: "Declaração emitida",
          description: `Declaração de comparecimento - ${declaracao.nome_completo}`,
          time: declaracao.data_criacao,
          icon: "FileText"
        });
      });
    } catch (err) {
      console.log('Sem declarações recentes');
    }

    // Participações recentes em oficinas
    try {
      const recentParticipacoes = await pool.query(`
        SELECT p.*, b.nome_completo, pr.nome as projeto_nome
        FROM participacoes p
        JOIN beneficiarias b ON p.beneficiaria_id = b.id
        JOIN projetos pr ON p.projeto_id = pr.id
        WHERE p.ativo = true AND b.ativo = true AND pr.ativo = true
        ORDER BY p.data_criacao DESC 
        LIMIT 3
      `);

      recentParticipacoes.rows.forEach(participacao => {
        activities.push({
          id: `participacao-${participacao.id}`,
          type: "Participação em projeto",
          description: `${participacao.nome_completo} - ${participacao.projeto_nome}`,
          time: participacao.data_criacao || new Date().toISOString(),
          icon: "Calendar"
        });
      });
    } catch (err) {
      console.log('Sem participações recentes:', err.message);
    }

    // Ordenar por data mais recente e limitar
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const recentActivities = activities.slice(0, 5);

    res.json(successResponse(recentActivities, "Atividades carregadas com sucesso"));
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json(errorResponse('Erro ao carregar atividades'));
  }
});

// Endpoint para tarefas pendentes
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = [];

    // Verificar beneficiárias sem declarações recentes
    try {
        const beneficiariasSemDeclaracoes = await pool.query(`
          SELECT COUNT(*) as count 
          FROM beneficiarias b
          WHERE b.ativo = true AND NOT EXISTS (
            SELECT 1 FROM declaracoes_comparecimento d 
            WHERE d.beneficiaria_id = b.id 
            AND d.data_criacao >= CURRENT_DATE - INTERVAL '30 days'
          )
        `);      if (parseInt(beneficiariasSemDeclaracoes.rows[0].count) > 0) {
        tasks.push({
          id: 'review-beneficiarias',
          title: 'Revisar cadastros sem atividade recente',
          due: 'Hoje',
          priority: 'Alta'
        });
      }
    } catch (err) {
      // Ignore se tabela não existe
    }

    // Verificar oficinas sem participações
    try {
      const oficinasSemParticipacoes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM oficinas o
        WHERE o.ativo = true AND NOT EXISTS (
          SELECT 1 FROM participacoes p 
          WHERE p.oficina_id = o.id AND p.ativo = true
        )
      `);

      if (parseInt(oficinasSemParticipacoes.rows[0].count) > 0) {
        tasks.push({
          id: 'review-oficinas',
          title: 'Verificar oficinas sem participações',
          due: 'Amanhã',
          priority: 'Média'
        });
      }
    } catch (err) {
      // Ignore se tabela não existe
    }

    // Verificar mensagens não lidas
    try {
      const mensagensNaoLidas = await pool.query(`
        SELECT COUNT(*) as count 
        FROM mensagens 
        WHERE lida = false
      `);

      if (parseInt(mensagensNaoLidas.rows[0].count) > 0) {
        tasks.push({
          id: 'review-messages',
          title: `Responder ${mensagensNaoLidas.rows[0].count} mensagens pendentes`,
          due: 'Hoje',
          priority: 'Média'
        });
      }
    } catch (err) {
      // Ignore se tabela não existe
    }

    // Se não há tarefas reais, adicionar uma tarefa padrão
    if (tasks.length === 0) {
      tasks.push({
        id: 'system-update',
        title: 'Sistema atualizado e funcionando',
        due: 'Concluído',
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
