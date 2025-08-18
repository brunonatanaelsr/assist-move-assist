const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuração CORS específica para desenvolvimento
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://10.0.5.206:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Mock database para desenvolvimento local com dados expandidos
let beneficiarias = [
  {
    id: 1,
    nome: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    telefone: '(11) 99999-1111',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    email: 'maria.silva@email.com',
    status: 'ativo',
    data_nascimento: '1985-03-15',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    nome: 'Ana Paula Oliveira',
    cpf: '987.654.321-00',
    telefone: '(11) 99999-2222',
    endereco: 'Av. Principal, 456 - São Paulo, SP',
    email: 'ana.paula@email.com',
    status: 'ativo',
    data_nascimento: '1990-07-22',
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  },
  {
    id: 3,
    nome: 'Carla Regina Costa',
    cpf: '456.789.123-00',
    telefone: '(11) 99999-3333',
    endereco: 'Rua da Esperança, 789 - São Paulo, SP',
    email: 'carla.costa@email.com',
    status: 'ativo',
    data_nascimento: '1978-12-10',
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z'
  }
];

let nextId = 4;

// Dados mock para estatísticas
const mockStats = {
  totalBeneficiarias: () => beneficiarias.length,
  beneficiariasAtivas: () => beneficiarias.filter(b => b.status === 'ativo').length,
  atendimentosMes: 45,
  formulariosPreenchidos: 32,
  presencasOficinas: 78
};

// Health check básico
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Health check detalhado
app.get('/health/detailed', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'OK', type: 'mock' },
      api: { status: 'OK', uptime: process.uptime() }
    },
    stats: {
      beneficiarias: mockStats.totalBeneficiarias(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  });
});

// Teste de conexão de banco (mock)
app.get('/api/test-db', async (req, res) => {
  res.json({ 
    success: true, 
    time: new Date().toISOString(), 
    mode: 'local-mock',
    records: beneficiarias.length
  });
});

// Login com rate limiting simulado
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (email === 'admin@movemarias.com' && password === 'admin123') {
    res.json({ 
      success: true, 
      user: { 
        id: 1, 
        name: 'Admin Local', 
        email,
        role: 'admin'
      },
      token: 'token-local-' + Date.now()
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Credenciais inválidas' 
    });
  }
});

// Listar beneficiárias com paginação e filtros
app.get('/api/beneficiarias', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    let filteredBeneficiarias = [...beneficiarias];
    
    // Aplicar filtro de busca
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredBeneficiarias = filteredBeneficiarias.filter(b => 
        b.nome.toLowerCase().includes(searchTerm) ||
        b.cpf.includes(searchTerm) ||
        b.email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Aplicar filtro de status
    if (status) {
      filteredBeneficiarias = filteredBeneficiarias.filter(b => b.status === status);
    }
    
    // Aplicar paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = filteredBeneficiarias.slice(startIndex, endIndex);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 200));
    
    res.json({ 
      success: true, 
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredBeneficiarias.length,
        pages: Math.ceil(filteredBeneficiarias.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar beneficiárias',
      error: error.message 
    });
  }
});

// Buscar beneficiária por ID
app.get('/api/beneficiarias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const beneficiaria = beneficiarias.find(b => b.id === parseInt(id));
    
    if (!beneficiaria) {
      return res.status(404).json({ 
        success: false, 
        message: 'Beneficiária não encontrada' 
      });
    }
    
    res.json({ 
      success: true, 
      data: beneficiaria 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar beneficiária',
      error: error.message 
    });
  }
});

// Criar nova beneficiária
app.post('/api/beneficiarias', async (req, res) => {
  try {
    const novaBeneficiaria = {
      id: nextId++,
      ...req.body,
      status: 'ativo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    beneficiarias.push(novaBeneficiaria);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 300));
    
    res.status(201).json({ 
      success: true, 
      data: novaBeneficiaria,
      message: 'Beneficiária criada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar beneficiária',
      error: error.message 
    });
  }
});

// Atualizar beneficiária
app.put('/api/beneficiarias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = beneficiarias.findIndex(b => b.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Beneficiária não encontrada' 
      });
    }
    
    beneficiarias[index] = {
      ...beneficiarias[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 250));
    
    res.json({ 
      success: true, 
      data: beneficiarias[index],
      message: 'Beneficiária atualizada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar beneficiária',
      error: error.message 
    });
  }
});

// Deletar beneficiária (soft delete)
app.delete('/api/beneficiarias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = beneficiarias.findIndex(b => b.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Beneficiária não encontrada' 
      });
    }
    
    beneficiarias[index].status = 'inativo';
    beneficiarias[index].updated_at = new Date().toISOString();
    
    res.json({ 
      success: true, 
      message: 'Beneficiária removida com sucesso'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao remover beneficiária',
      error: error.message 
    });
  }
});

// Estatísticas do dashboard
app.get('/api/stats', async (req, res) => {
  try {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 400));
    
    res.json({
      success: true,
      data: {
        totalBeneficiarias: mockStats.totalBeneficiarias(),
        beneficiariasAtivas: mockStats.beneficiariasAtivas(),
        atendimentosMes: mockStats.atendimentosMes,
        formulariosPreenchidos: mockStats.formulariosPreenchidos,
        presencasOficinas: mockStats.presencasOficinas,
        crescimentoMensal: '+12%',
        ultimaAtualizacao: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar estatísticas',
      error: error.message 
    });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.originalUrl} não encontrada`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Backend LOCAL rodando na porta', PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/health');
  console.log('🌐 API base: http://localhost:' + PORT + '/api');
  console.log('📝 Beneficiárias mock:', beneficiarias.length, 'registros');
  console.log('📋 Estatísticas disponíveis em: /api/stats');
  console.log('🔍 Health detalhado em: /health/detailed');
});
