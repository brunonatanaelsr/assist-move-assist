const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para rate limiting
app.set("trust proxy", 1);

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
  
  // Configurações do pool
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // SSL para produção
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());
app.use(morgan("combined"));

// CORS configurado para produção
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://movemarias.squadsolucoes.com.br",
      "https://movemarias.squadsolucoes.com.br",
      "http://localhost:5173",
      "http://localhost:3001"
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Muitas requisições. Tente novamente mais tarde." }
});

app.use("/api/auth/login", loginLimiter);
app.use("/api", generalLimiter);

app.use(express.json({ limit: "10mb" }));

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acesso requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production', (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// Verificar conexão com banco
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Conexão com PostgreSQL estabelecida");
    return true;
  } catch (error) {
    console.error("❌ Erro na conexão com PostgreSQL:", error.message);
    return false;
  }
}

// ROTAS DE AUTENTICAÇÃO
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email e senha são obrigatórios" 
      });
    }

    console.log(`Login attempt: ${email} from ${req.ip}`);

    const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      console.log(`Failed login attempt: ${email} from ${req.ip} - User not found`);
      return res.status(401).json({ 
        success: false, 
        message: "Credenciais inválidas" 
      });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.senha_hash);
    
    if (!validPassword) {
      console.log(`Failed login attempt: ${email} from ${req.ip} - Invalid password`);
      return res.status(401).json({ 
        success: false, 
        message: "Credenciais inválidas" 
      });
    }

    await pool.query(
      "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.papel 
      },
      process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production',
      { expiresIn: "24h" }
    );

    console.log(`Successful login: ${email} from ${req.ip}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.papel
      },
      token
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userQuery = "SELECT id, nome, email, papel FROM usuarios WHERE id = $1 AND ativo = true";
    const userResult = await pool.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];
    res.json({
      id: user.id,
      name: user.nome,
      email: user.email,
      role: user.papel
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ROTAS DE BENEFICIÁRIAS
app.get("/api/beneficiarias", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM beneficiarias WHERE ativo = true";
    let params = [];

    if (search) {
      query += " AND (nome_completo ILIKE $1 OR cpf ILIKE $1 OR email ILIKE $1)";
      params.push(`%${search}%`);
    }

    query += " ORDER BY nome_completo LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = "SELECT COUNT(*) FROM beneficiarias WHERE ativo = true";
    let countParams = [];

    if (search) {
      countQuery += " AND (nome_completo ILIKE $1 OR cpf ILIKE $1 OR email ILIKE $1)";
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    console.log(`Beneficiarias request from ${req.ip}: page=${page}, limit=${limit}, search=${search || "no"}`);

    res.json({
      beneficiarias: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Beneficiarias error:", error);
    res.status(500).json({ error: "Erro ao buscar beneficiárias" });
  }
});

// Criar beneficiária
app.post("/api/beneficiarias", authenticateToken, async (req, res) => {
  try {
    const { nome_completo, cpf, email, telefone, endereco, data_nascimento } = req.body;

    if (!nome_completo) {
      return res.status(400).json({ error: "Nome completo é obrigatório" });
    }

    // Verificar se CPF já existe (se fornecido)
    if (cpf) {
      const cpfCheck = await pool.query("SELECT id FROM beneficiarias WHERE cpf = $1 AND ativo = true", [cpf]);
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: "CPF já cadastrado" });
      }
    }

    const insertQuery = `
      INSERT INTO beneficiarias (nome_completo, cpf, email, telefone, endereco, data_nascimento)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      nome_completo,
      cpf || null,
      email || null,
      telefone || null,
      endereco || null,
      data_nascimento || null
    ]);

    console.log(`Nova beneficiária criada: ${nome_completo} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      beneficiaria: result.rows[0]
    });

  } catch (error) {
    console.error("Create beneficiaria error:", error);
    res.status(500).json({ error: "Erro ao criar beneficiária" });
  }
});

// Atualizar beneficiária
app.put("/api/beneficiarias/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_completo, cpf, email, telefone, endereco, data_nascimento } = req.body;

    if (!nome_completo) {
      return res.status(400).json({ error: "Nome completo é obrigatório" });
    }

    // Verificar se beneficiária existe
    const checkQuery = "SELECT id FROM beneficiarias WHERE id = $1 AND ativo = true";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Beneficiária não encontrada" });
    }

    // Verificar se CPF já existe em outro registro
    if (cpf) {
      const cpfCheck = await pool.query(
        "SELECT id FROM beneficiarias WHERE cpf = $1 AND id != $2 AND ativo = true", 
        [cpf, id]
      );
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: "CPF já cadastrado para outra beneficiária" });
      }
    }

    const updateQuery = `
      UPDATE beneficiarias 
      SET nome_completo = $1, cpf = $2, email = $3, telefone = $4, 
          endereco = $5, data_nascimento = $6, data_atualizacao = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      nome_completo,
      cpf || null,
      email || null,
      telefone || null,
      endereco || null,
      data_nascimento || null,
      id
    ]);

    console.log(`Beneficiária atualizada: ${nome_completo} por ${req.user.email}`);

    res.json({
      success: true,
      beneficiaria: result.rows[0]
    });

  } catch (error) {
    console.error("Update beneficiaria error:", error);
    res.status(500).json({ error: "Erro ao atualizar beneficiária" });
  }
});

// Deletar beneficiária (soft delete)
app.delete("/api/beneficiarias/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT nome_completo FROM beneficiarias WHERE id = $1 AND ativo = true";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Beneficiária não encontrada" });
    }

    const updateQuery = "UPDATE beneficiarias SET ativo = false, data_atualizacao = NOW() WHERE id = $1";
    await pool.query(updateQuery, [id]);

    console.log(`Beneficiária removida: ${checkResult.rows[0].nome_completo} por ${req.user.email}`);

    res.json({
      success: true,
      message: "Beneficiária removida com sucesso"
    });

  } catch (error) {
    console.error("Delete beneficiaria error:", error);
    res.status(500).json({ error: "Erro ao remover beneficiária" });
  }
});

// ============================================================================
// ENDPOINTS PARA PROJETOS
// ============================================================================

// Listar projetos
app.get("/api/projetos", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.*, 
        COUNT(pa.id) as total_participantes
       FROM projetos p
       LEFT JOIN participacoes pa ON p.id = pa.projeto_id
       WHERE p.ativo = true
       GROUP BY p.id
       ORDER BY p.data_criacao DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM projetos WHERE ativo = true'
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error("Get projetos error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao buscar projetos" 
    });
  }
});

// Criar projeto
app.post("/api/projetos", authenticateToken, async (req, res) => {
  try {
    const {
      nome,
      descricao,
      data_inicio,
      data_fim,
      vagas_disponiveis,
      requisitos,
      objetivos
    } = req.body;

    const result = await pool.query(
      `INSERT INTO projetos (
        nome, descricao, data_inicio, data_fim, 
        vagas_disponiveis, requisitos, objetivos,
        criado_por, data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
        RETURNING *`,
      [nome, descricao, data_inicio, data_fim, vagas_disponiveis, requisitos, objetivos, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Projeto criado com sucesso"
    });

  } catch (error) {
    console.error("Create projeto error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao criar projeto" 
    });
  }
});

// Atualizar projeto
app.put("/api/projetos/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      data_inicio,
      data_fim,
      vagas_disponiveis,
      requisitos,
      objetivos
    } = req.body;

    const result = await pool.query(
      `UPDATE projetos SET 
        nome = $1, descricao = $2, data_inicio = $3, data_fim = $4,
        vagas_disponiveis = $5, requisitos = $6, objetivos = $7,
        data_atualizacao = NOW()
       WHERE id = $8 AND ativo = true
       RETURNING *`,
      [nome, descricao, data_inicio, data_fim, vagas_disponiveis, requisitos, objetivos, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Projeto atualizado com sucesso"
    });

  } catch (error) {
    console.error("Update projeto error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao atualizar projeto" 
    });
  }
});

// Excluir projeto (soft delete)
app.delete("/api/projetos/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE projetos SET ativo = false, data_atualizacao = NOW() 
       WHERE id = $1 AND ativo = true
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Projeto excluído com sucesso'
    });

  } catch (error) {
    console.error("Delete projeto error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao excluir projeto" 
    });
  }
});

// ============================================================================
// ENDPOINTS PARA OFICINAS
// ============================================================================

// Listar oficinas
app.get("/api/oficinas", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT o.*,
        COUNT(pa.id) as total_participantes
       FROM oficinas o
       LEFT JOIN participacoes pa ON o.id = pa.oficina_id
       WHERE o.ativo = true
       GROUP BY o.id
       ORDER BY o.data_inicio DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM oficinas WHERE ativo = true'
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error("Get oficinas error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao buscar oficinas" 
    });
  }
});

// Criar oficina
app.post("/api/oficinas", authenticateToken, async (req, res) => {
  try {
    const {
      nome,
      descricao,
      data_inicio,
      data_fim,
      horario_inicio,
      horario_fim,
      local,
      instrutor,
      vagas_totais,
      ativa = true
    } = req.body;

    if (!nome || !data_inicio || !horario_inicio || !horario_fim) {
      return res.status(400).json({ error: "Campos obrigatórios: nome, data_inicio, horario_inicio, horario_fim" });
    }

    const result = await pool.query(
      `INSERT INTO oficinas (
        nome, descricao, data_inicio, data_fim, 
        horario_inicio, horario_fim, local, instrutor,
        vagas_totais, ativa, criado_por, data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
        RETURNING *`,
      [nome, descricao, data_inicio, data_fim, horario_inicio, horario_fim, local, instrutor, vagas_totais, ativa, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Oficina criada com sucesso"
    });

  } catch (error) {
    console.error("Create oficina error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao criar oficina" 
    });
  }
});

// Atualizar oficina
app.put("/api/oficinas/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      data_inicio,
      data_fim,
      horario_inicio,
      horario_fim,
      local,
      instrutor,
      vagas_totais,
      ativa
    } = req.body;

    const result = await pool.query(
      `UPDATE oficinas SET 
        nome = $1, descricao = $2, data_inicio = $3, data_fim = $4,
        horario_inicio = $5, horario_fim = $6, local = $7, instrutor = $8,
        vagas_totais = $9, ativa = $10, data_atualizacao = NOW()
      WHERE id = $11 AND ativo = true 
      RETURNING *`,
      [nome, descricao, data_inicio, data_fim, horario_inicio, horario_fim, local, instrutor, vagas_totais, ativa, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Oficina não encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Oficina atualizada com sucesso"
    });

  } catch (error) {
    console.error("Update oficina error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao atualizar oficina" 
    });
  }
});

// Excluir oficina (soft delete)
app.delete("/api/oficinas/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE oficinas SET ativo = false, data_atualizacao = NOW() WHERE id = $1 AND ativo = true RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Oficina não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Oficina excluída com sucesso'
    });

  } catch (error) {
    console.error("Delete oficina error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao excluir oficina" 
    });
  }
});

// ============================================================================
// ENDPOINTS PARA ATIVIDADES/PARTICIPAÇÕES
// ============================================================================

// Listar atividades de uma beneficiária
app.get("/api/beneficiarias/:id/atividades", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.data_participacao,
        p.presente,
        p.observacoes,
        COALESCE(proj.nome, of.nome) as atividade_nome,
        CASE 
          WHEN proj.id IS NOT NULL THEN 'projeto'
          WHEN of.id IS NOT NULL THEN 'oficina'
        END as tipo_atividade
       FROM participacoes p
       LEFT JOIN projetos proj ON p.projeto_id = proj.id
       LEFT JOIN oficinas of ON p.oficina_id = of.id
       WHERE p.beneficiaria_id = $1
       ORDER BY p.data_participacao DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get atividades error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao buscar atividades" 
    });
  }
});

// Criar participação
app.post("/api/participacoes", authenticateToken, async (req, res) => {
  try {
    const {
      beneficiaria_id,
      projeto_id,
      oficina_id,
      data_participacao,
      presente = true,
      observacoes
    } = req.body;

    if (!beneficiaria_id || (!projeto_id && !oficina_id)) {
      return res.status(400).json({ 
        error: "Campos obrigatórios: beneficiaria_id e (projeto_id ou oficina_id)" 
      });
    }

    const result = await pool.query(
      `INSERT INTO participacoes (
        beneficiaria_id, projeto_id, oficina_id, 
        data_participacao, presente, observacoes, data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
        RETURNING *`,
      [beneficiaria_id, projeto_id, oficina_id, data_participacao || new Date(), presente, observacoes]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Participação registrada com sucesso"
    });

  } catch (error) {
    console.error("Create participacao error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao registrar participação" 
    });
  }
});

// Atualizar participação
app.put("/api/participacoes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { presente, observacoes } = req.body;

    const result = await pool.query(
      `UPDATE participacoes SET 
        presente = $1, observacoes = $2, data_atualizacao = NOW()
       WHERE id = $3
       RETURNING *`,
      [presente, observacoes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participação não encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Participação atualizada com sucesso"
    });

  } catch (error) {
    console.error("Update participacao error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao atualizar participação" 
    });
  }
});

// ============================================================================
// ENDPOINTS PARA MENSAGENS
// ============================================================================

// Listar mensagens
app.get("/api/mensagens", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT m.*, 
        u.nome as remetente_nome
       FROM mensagens m
       LEFT JOIN usuarios u ON m.remetente_id = u.id
       WHERE m.destinatario_id = $1 OR m.remetente_id = $1
       ORDER BY m.data_envio DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get mensagens error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao buscar mensagens" 
    });
  }
});

// Enviar mensagem
app.post("/api/mensagens", authenticateToken, async (req, res) => {
  try {
    const {
      destinatario_id,
      assunto,
      conteudo,
      tipo = 'normal'
    } = req.body;

    if (!destinatario_id || !conteudo) {
      return res.status(400).json({ 
        error: "Campos obrigatórios: destinatario_id, conteudo" 
      });
    }

    const result = await pool.query(
      `INSERT INTO mensagens (
        remetente_id, destinatario_id, assunto, conteudo, tipo, data_envio
      ) VALUES ($1, $2, $3, $4, $5, NOW()) 
        RETURNING *`,
      [req.user.id, destinatario_id, assunto, conteudo, tipo]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Mensagem enviada com sucesso"
    });

  } catch (error) {
    console.error("Send mensagem error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro ao enviar mensagem" 
    });
  }
});

// Health check
app.get("/health", async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    
    // Contar registros reais
    const userCount = await pool.query("SELECT COUNT(*) FROM usuarios WHERE ativo = true");
    const beneficiariaCount = await pool.query("SELECT COUNT(*) FROM beneficiarias WHERE ativo = true");
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "production",
      version: "1.0.0",
      database: {
        status: dbConnected ? "connected" : "disconnected",
        type: "PostgreSQL",
        users: parseInt(userCount.rows[0].count),
        beneficiarias: parseInt(beneficiariaCount.rows[0].count)
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB"
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error("Error:", error);
  
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS: Origem não permitida" });
  }
  
  res.status(500).json({ 
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? error.message : undefined
  });
});

// Rota 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Inicializar servidor
async function startServer() {
  try {
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.error("❌ Não foi possível conectar ao banco de dados");
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor de PRODUÇÃO rodando na porta ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "production"}`);
      console.log(`🔒 Segurança: Helmet, Rate Limiting, CORS habilitados`);
      console.log(`💾 Banco: PostgreSQL Real com CRUD completo`);
    });

  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  pool.end();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  pool.end();
  process.exit(0);
});

startServer();
