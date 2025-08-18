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

// Mock database para desenvolvimento local
let beneficiarias = [
  {
    id: 1,
    nome: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    telefone: '(11) 99999-1111',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    nome: 'Ana Paula Oliveira',
    cpf: '987.654.321-00',
    telefone: '(11) 99999-2222',
    endereco: 'Av. Principal, 456 - São Paulo, SP',
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  }
];

let nextId = 3;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test-db', async (req, res) => {
  res.json({ success: true, time: new Date().toISOString(), mode: 'local-mock' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@movemarias.com' && password === 'admin123') {
    res.json({ 
      success: true, 
      user: { id: 1, name: 'Admin Local', email },
      token: 'token-local-' + Date.now()
    });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais invalidas' });
  }
});

app.get('/api/beneficiarias', async (req, res) => {
  res.json({ success: true, data: beneficiarias });
});

app.post('/api/beneficiarias', async (req, res) => {
  try {
    const { nome, cpf, telefone, endereco } = req.body;
    
    if (!nome || !cpf) {
      return res.status(400).json({ success: false, message: 'Nome e CPF obrigatorios' });
    }

    const novaBeneficiaria = {
      id: nextId++,
      nome,
      cpf,
      telefone: telefone || '',
      endereco: endereco || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    beneficiarias.push(novaBeneficiaria);

    res.status(201).json({ success: true, data: novaBeneficiaria });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/beneficiarias/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const beneficiaria = beneficiarias.find(b => b.id === id);
  
  if (beneficiaria) {
    res.json({ success: true, data: beneficiaria });
  } else {
    res.status(404).json({ success: false, message: 'Beneficiária não encontrada' });
  }
});

app.put('/api/beneficiarias/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, cpf, telefone, endereco } = req.body;
  
  const index = beneficiarias.findIndex(b => b.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Beneficiária não encontrada' });
  }
  
  beneficiarias[index] = {
    ...beneficiarias[index],
    nome: nome || beneficiarias[index].nome,
    cpf: cpf || beneficiarias[index].cpf,
    telefone: telefone || beneficiarias[index].telefone,
    endereco: endereco || beneficiarias[index].endereco,
    updated_at: new Date().toISOString()
  };
  
  res.json({ success: true, data: beneficiarias[index] });
});

app.delete('/api/beneficiarias/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const index = beneficiarias.findIndex(b => b.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Beneficiária não encontrada' });
  }
  
  beneficiarias.splice(index, 1);
  res.json({ success: true, message: 'Beneficiária removida com sucesso' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend LOCAL rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API base: http://localhost:${PORT}/api`);
  console.log(`📝 Beneficiárias mock: ${beneficiarias.length} registros`);
});

module.exports = app;
