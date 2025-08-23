const express = require('express');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Dashboard geral
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Definir período do mês atual
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    console.log('Buscando dados do dashboard...');
    
    // Executar todas as consultas em paralelo
    const [
      beneficiariasResult,
      formulariosResult,
      atendimentosResult,
      engajamentoResult,
      beneficiariasStatusResult
    ] = await Promise.all([
      // Total de beneficiárias ativas
      pool.query(`
        SELECT 
          COUNT(*) as total, 
          COUNT(CASE WHEN ativo = true THEN 1 END) as ativas,
          COUNT(CASE WHEN ativo = false THEN 1 END) as inativas
        FROM beneficiarias`),
      
      // Total de formulários preenchidos
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM roda_vida WHERE ativo = true) +
          (SELECT COUNT(*) FROM fichas_evolucao WHERE ativo = true) +
          (SELECT COUNT(*) FROM visao_holistica WHERE ativo = true) +
          (SELECT COUNT(*) FROM anamneses_social WHERE ativo = true) as total
      `),
      
      // Atendimentos do mês atual
      pool.query(
        'SELECT COUNT(*) as total FROM historico_atendimentos WHERE ativo = true AND data_atendimento BETWEEN $1 AND $2',
        [primeiroDiaMes, ultimoDiaMes]
      ),
      
      // Taxa de engajamento
      pool.query(`
        WITH dados_presenca AS (
          SELECT 
            COUNT(DISTINCT po.beneficiaria_id)::float as total_presentes,
            COUNT(DISTINCT b.id)::float as total_beneficiarias,
            COUNT(DISTINCT o.id)::float as total_oficinas
          FROM oficinas o
          LEFT JOIN presencas_oficinas po ON o.id = po.oficina_id AND po.presente = true
          CROSS JOIN (SELECT id FROM beneficiarias WHERE ativo = true) b
          WHERE o.data >= $1 AND o.data <= $2 AND o.ativo = true
        )
        SELECT 
          CASE 
            WHEN total_beneficiarias = 0 OR total_oficinas = 0 THEN 0
            ELSE ROUND((total_presentes / (total_beneficiarias * total_oficinas)) * 100)
          END as taxa_engajamento
        FROM dados_presenca
      `, [primeiroDiaMes, ultimoDiaMes]),
      
      // Beneficiárias por status
      pool.query(`
        SELECT 
          CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as status,
          COUNT(*) as total
        FROM beneficiarias 
        GROUP BY ativo
        ORDER BY ativo DESC
      `)
    ]);

    // Extrair dados das consultas
    const beneficiariasData = beneficiariasResult.rows[0];
    const totalBeneficiarias = parseInt(beneficiariasData.total) || 0;
    const beneficiariasAtivas = parseInt(beneficiariasData.ativas) || 0;
    const beneficiariasInativas = parseInt(beneficiariasData.inativas) || 0;
    const totalFormularios = parseInt(formulariosResult.rows[0].total) || 0;
    const atendimentosMes = parseInt(atendimentosResult.rows[0].total) || 0;
    const taxaEngajamento = parseInt(engajamentoResult.rows[0].taxa_engajamento) || 0;

    // Consultas opcionais (podem falhar se tabelas não existirem)
    const [oficinasStatus, projetosStatus, estatisticasParticipacao] = await Promise.all([
      getOficinasStatus(),
      getProjetosStatus(),
      getEstatisticasParticipacao()
    ]);

    // Log dos resultados das consultas
    console.log('Resultados das consultas:');
    console.log('- Beneficiárias:', beneficiariasResult.rows);
    console.log('- Formulários:', formulariosResult.rows);
    console.log('- Atendimentos:', atendimentosResult.rows);
    console.log('- Engajamento:', engajamentoResult.rows);
    console.log('- Status Beneficiárias:', beneficiariasStatusResult.rows);

    const dashboardData = {
      totalBeneficiarias,
      beneficiariasAtivas,
      beneficiariasInativas,
      totalFormularios,
      atendimentosMes,
      taxaEngajamento: `${taxaEngajamento}%`,
      detalhes: {
        beneficiarias_status: beneficiariasStatusResult.rows,
        oficinas_status: oficinasStatus,
        projetos_status: projetosStatus,
        participacoes: estatisticasParticipacao
      },
      timestamp: new Date().toISOString()
    };

    console.log('Dashboard data completo:', JSON.stringify(dashboardData, null, 2));
    res.json(successResponse(dashboardData, "Dashboard carregado com sucesso"));

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json(errorResponse("Erro ao carregar dashboard"));
  }
});

// Funções auxiliares para consultas opcionais
async function getOficinasStatus() {
  try {
    const result = await pool.query(`
      SELECT 
        CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as status,
        COUNT(*) as total
      FROM oficinas 
      GROUP BY ativo
      ORDER BY ativo DESC
    `);
    return result.rows;
  } catch (err) {
    console.log('Tabela oficinas não encontrada ou sem dados:', err.message);
    return [];
  }
}

async function getProjetosStatus() {
  try {
    const result = await pool.query(`
      SELECT 
        CASE WHEN ativo = true THEN 'Ativo' ELSE 'Inativo' END as status,
        COUNT(*) as total
      FROM projetos 
      GROUP BY ativo
      ORDER BY ativo DESC
    `);
    return result.rows;
  } catch (err) {
    console.log('Erro ao buscar projetos por status:', err.message);
    return [];
  }
}

async function getEstatisticasParticipacao() {
  try {
    const [participacoesAtivasResult, beneficiariasComParticipacaoResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM participacoes WHERE ativo = true'),
      pool.query('SELECT COUNT(DISTINCT beneficiaria_id) as count FROM participacoes WHERE ativo = true')
    ]);

    return {
      participacoesAtivas: parseInt(participacoesAtivasResult.rows[0].count),
      beneficiariasComParticipacao: parseInt(beneficiariasComParticipacaoResult.rows.count)
    };
  } catch (err) {
    console.log('Erro ao buscar estatísticas de participação:', err.message);
    return {
      participacoesAtivas: 0,
      beneficiariasComParticipacao: 0
    };
  }
}

// Endpoint para estatísticas resumidas
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [beneficiariasResult, formulariosResult, atendimentosResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM beneficiarias WHERE ativo = true'),
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM roda_vida WHERE ativo = true) +
          (SELECT COUNT(*) FROM fichas_evolucao WHERE ativo = true) +
          (SELECT COUNT(*) FROM visao_holistica WHERE ativo = true) +
          (SELECT COUNT(*) FROM anamneses_social WHERE ativo = true) as count
      `),
      pool.query(
        'SELECT COUNT(*) as count FROM historico_atendimentos WHERE ativo = true AND data_atendimento BETWEEN $1 AND $2',
        [primeiroDiaMes, ultimoDiaMes]
      )
    ]);

    const stats = {
      totalBeneficiarias: parseInt(beneficiariasResult.rows[0].count),
      totalFormularios: parseInt(formulariosResult.rows.count),
      atendimentosMes: parseInt(atendimentosResult.rows.count)
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
      WHERE ativo = true AND data_criacao IS NOT NULL
      ORDER BY data_criacao DESC 
      LIMIT 3
    `);

    recentBeneficiarias.rows.forEach(beneficiaria => {
      activities.push({
        id: `beneficiaria-${beneficiaria.nome_completo}`,
        type: "Nova beneficiária",
        description: `${beneficiaria.nome_completo} foi cadastrada no sistema`,
        time: beneficiaria.data_criacao,
        icon: "Users"
      });
    });

    // Adicionar outras atividades de forma segura
    await addDeclaracoesRecentes(activities);
    await addParticipacoesRecentes(activities);

    // Ordenar por data mais recente e limitar
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 5);

    res.json(successResponse(recentActivities, "Atividades carregadas com sucesso"));
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json(errorResponse('Erro ao carregar atividades'));
  }
});

async function addDeclaracoesRecentes(activities) {
  try {
    const recentDeclaracoes = await pool.query(`
      SELECT d.id, d.data_criacao, b.nome_completo 
      FROM declaracoes_comparecimento d
      JOIN beneficiarias b ON d.beneficiaria_id = b.id
      WHERE b.ativo = true AND d.data_criacao IS NOT NULL
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
    console.log('Tabela declaracoes_comparecimento não encontrada');
  }
}

async function addParticipacoesRecentes(activities) {
  try {
    const recentParticipacoes = await pool.query(`
      SELECT p.id, p.data_criacao, b.nome_completo, pr.nome as projeto_nome
      FROM participacoes p
      JOIN beneficiarias b ON p.beneficiaria_id = b.id
      JOIN projetos pr ON p.projeto_id = pr.id
      WHERE p.ativo = true AND b.ativo = true AND pr.ativo = true AND p.data_criacao IS NOT NULL
      ORDER BY p.data_criacao DESC 
      LIMIT 3
    `);

    recentParticipacoes.rows.forEach(participacao => {
      activities.push({
        id: `participacao-${participacao.id}`,
        type: "Participação em projeto",
        description: `${participacao.nome_completo} - ${participacao.projeto_nome}`,
        time: participacao.data_criacao,
        icon: "Calendar"
      });
    });
  } catch (err) {
    console.log('Erro ao buscar participações recentes:', err.message);
  }
}

// Endpoint para tarefas pendentes
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = [];

    // Verificar beneficiárias sem declarações recentes
    await addTaskBeneficiariasSemDeclaracoes(tasks);
    
    // Verificar oficinas sem participações
    await addTaskOficinasSemParticipacoes(tasks);
    
    // Verificar mensagens não lidas
    await addTaskMensagensNaoLidas(tasks);

    // Se não há tarefas reais, adicionar uma tarefa padrão
    if (tasks.length === 0) {
      tasks.push({
        id: 'system-ok',
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

async function addTaskBeneficiariasSemDeclaracoes(tasks) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM beneficiarias b
      WHERE b.ativo = true AND NOT EXISTS (
        SELECT 1 FROM declaracoes_comparecimento d 
        WHERE d.beneficiaria_id = b.id 
        AND d.data_criacao >= CURRENT_DATE - INTERVAL '30 days'
      )
    `);
    
    if (parseInt(result.rows[0].count) > 0) {
      tasks.push({
        id: 'review-beneficiarias',
        title: `${result.rows.count} beneficiárias sem atividade recente`,
        due: 'Hoje',
        priority: 'Alta'
      });
    }
  } catch (err) {
    console.log('Não foi possível verificar declarações');
  }
}

async function addTaskOficinasSemParticipacoes(tasks) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM oficinas o
      WHERE o.ativo = true AND NOT EXISTS (
        SELECT 1 FROM participacoes p 
        WHERE p.oficina_id = o.id AND p.ativo = true
      )
    `);

    if (parseInt(result.rows[0].count) > 0) {
      tasks.push({
        id: 'review-oficinas',
        title: `${result.rows.count} oficinas sem participações`,
        due: 'Amanhã',
        priority: 'Média'
      });
    }
  } catch (err) {
    console.log('Não foi possível verificar oficinas');
  }
}

async function addTaskMensagensNaoLidas(tasks) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM mensagens 
      WHERE lida = false
    `);

    const count = parseInt(result.rows.count);
    if (count > 0) {
      tasks.push({
        id: 'review-messages',
        title: `${count} mensagens pendentes`,
        due: 'Hoje',
        priority: 'Média'
      });
    }
  } catch (err) {
    console.log('Tabela mensagens não encontrada');
  }
}

module.exports = router;