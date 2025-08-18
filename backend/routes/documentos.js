const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');
const { registrarEvento } = require('./auditoria');
const { 
  upload, 
  calcularHashArquivo, 
  validarArquivo, 
  removerArquivo 
} = require('../src/config/upload');

const router = express.Router();

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

// Listar documentos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      beneficiaria_id, 
      tipo, 
      page = 1, 
      limit = 50,
      sort_by = 'data_upload',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const params = [];
    let paramCount = 0;
    let whereConditions = ['d.ativo = true'];
    
    if (beneficiaria_id) {
      paramCount++;
      whereConditions.push(`d.beneficiaria_id = $${paramCount}`);
      params.push(beneficiaria_id);
    }
    
    if (tipo) {
      paramCount++;
      whereConditions.push(`d.tipo = $${paramCount}`);
      params.push(tipo);
    }
    
    const query = `
      SELECT 
        d.*,
        b.nome_completo as beneficiaria_nome,
        u.nome as usuario_upload_nome,
        (
          SELECT json_build_object(
            'versao', v.versao,
            'data_upload', v.data_upload,
            'usuario_nome', up.nome
          )
          FROM versoes_documentos v
          LEFT JOIN usuarios up ON v.usuario_upload_id = up.id
          WHERE v.documento_id = d.id
          ORDER BY v.versao DESC
          LIMIT 1
        ) as ultima_versao
      FROM documentos d
      LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
      LEFT JOIN usuarios u ON d.usuario_upload_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY d.${sort_by} ${sort_order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM documentos d
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    params.push(limit, offset);
    
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    const documentosFormatados = formatArrayDates(result.rows, [
      'data_upload',
      'data_atualizacao',
      'ultima_versao.data_upload'
    ]);

    // Registrar evento de auditoria
    await registrarEvento(
      'CONSULTA',
      'Consulta à lista de documentos',
      req.user.id,
      'documentos',
      { filtros: req.query },
      req.ip
    );

    res.json(successResponse(documentosFormatados, "Documentos carregados com sucesso", {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }));

  } catch (error) {
    console.error("Get documentos error:", error);
    res.status(500).json(errorResponse("Erro ao buscar documentos"));
  }
});

// Upload de documento
router.post('/', authenticateToken, requireGestor, upload.single('arquivo'), async (req, res) => {
  try {
    const { beneficiaria_id, tipo, nome, descricao } = req.body;
    const arquivo = req.file;

    if (!beneficiaria_id || !tipo || !nome || !arquivo) {
      // Remover arquivo se houver erro de validação
      if (arquivo) {
        await removerArquivo(arquivo.path);
      }
      return res.status(400).json(errorResponse("ID da beneficiária, tipo, nome e arquivo são obrigatórios"));
    }

    // Validar arquivo
    const validacao = await validarArquivo(arquivo);
    if (!validacao.valido) {
      await removerArquivo(arquivo.path);
      return res.status(400).json(errorResponse(`Arquivo inválido: ${validacao.errors.join(', ')}`));
    }

    // Calcular hash do arquivo
    const hashArquivo = await calcularHashArquivo(arquivo.path);

    // Verificar se já existe documento com mesmo hash
    const hashCheck = await pool.query(
      "SELECT id FROM documentos WHERE hash_arquivo = $1 AND ativo = true",
      [hashArquivo]
    );

    if (hashCheck.rows.length > 0) {
      await removerArquivo(arquivo.path);
      return res.status(400).json(errorResponse("Documento duplicado detectado"));
    }

    // Criar documento no banco
    const result = await pool.query(
      `INSERT INTO documentos (
        beneficiaria_id, tipo, nome, descricao, mime_type,
        tamanho_bytes, hash_arquivo, caminho_arquivo,
        usuario_upload_id, meta_dados
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        beneficiaria_id,
        tipo,
        nome,
        descricao || null,
        arquivo.mimetype,
        arquivo.size,
        hashArquivo,
        arquivo.path,
        req.user.id,
        {
          original_name: arquivo.originalname,
          upload_ip: req.ip
        }
      ]
    );

    // Registrar evento de auditoria
    await registrarEvento(
      'UPLOAD',
      `Upload de documento: ${nome}`,
      req.user.id,
      'documentos',
      {
        documento_id: result.rows[0].id,
        beneficiaria_id,
        tipo,
        nome
      },
      req.ip
    );

    const documentoFormatado = formatObjectDates(result.rows[0], ['data_upload', 'data_atualizacao']);

    res.status(201).json(successResponse(documentoFormatado, "Documento criado com sucesso"));

  } catch (error) {
    console.error("Create documento error:", error);
    // Remover arquivo em caso de erro
    if (req.file) {
      await removerArquivo(req.file.path);
    }
    res.status(500).json(errorResponse("Erro ao criar documento"));
  }
});

// Obter documento específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { incluir_versoes } = req.query;

    // Query principal para obter documento
    const result = await pool.query(
      `SELECT 
        d.*,
        b.nome_completo as beneficiaria_nome,
        u.nome as usuario_upload_nome
       FROM documentos d
       LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
       LEFT JOIN usuarios u ON d.usuario_upload_id = u.id
       WHERE d.id = $1 AND d.ativo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    let documento = result.rows[0];

    // Buscar histórico de versões se solicitado
    if (incluir_versoes === 'true') {
      const versoesResult = await pool.query(
        `SELECT 
          v.*,
          u.nome as usuario_nome
         FROM versoes_documentos v
         LEFT JOIN usuarios u ON v.usuario_upload_id = u.id
         WHERE v.documento_id = $1
         ORDER BY v.versao DESC`,
        [id]
      );
      
      documento.versoes = formatArrayDates(versoesResult.rows, ['data_upload']);
    }

    // Registrar visualização na auditoria
    await registrarEvento(
      'VISUALIZACAO',
      `Visualização de documento: ${documento.nome}`,
      req.user.id,
      'documentos',
      { documento_id: id },
      req.ip
    );

    const documentoFormatado = formatObjectDates(documento, ['data_upload', 'data_atualizacao']);

    res.json(successResponse(documentoFormatado, "Documento carregado com sucesso"));

  } catch (error) {
    console.error("Get documento error:", error);
    res.status(500).json(errorResponse("Erro ao buscar documento"));
  }
});

// Atualizar documento
router.put('/:id', authenticateToken, requireGestor, upload.single('arquivo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, nome, descricao } = req.body;
    const arquivo = req.file;

    // Verificar se documento existe
    const checkResult = await pool.query(
      "SELECT * FROM documentos WHERE id = $1 AND ativo = true",
      [id]
    );

    if (checkResult.rows.length === 0) {
      if (arquivo) {
        await removerArquivo(arquivo.path);
      }
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    const documentoAtual = checkResult.rows[0];
    let hashArquivo = documentoAtual.hash_arquivo;
    let caminhoArquivo = documentoAtual.caminho_arquivo;
    let tamanhoBytes = documentoAtual.tamanho_bytes;
    let mimeType = documentoAtual.mime_type;

    // Se foi enviado novo arquivo
    if (arquivo) {
      // Validar novo arquivo
      const validacao = await validarArquivo(arquivo);
      if (!validacao.valido) {
        await removerArquivo(arquivo.path);
        return res.status(400).json(errorResponse(`Arquivo inválido: ${validacao.errors.join(', ')}`));
      }

      // Calcular hash do novo arquivo
      hashArquivo = await calcularHashArquivo(arquivo.path);

      // Verificar duplicidade
      const hashCheck = await pool.query(
        "SELECT id FROM documentos WHERE hash_arquivo = $1 AND id != $2 AND ativo = true",
        [hashArquivo, id]
      );

      if (hashCheck.rows.length > 0) {
        await removerArquivo(arquivo.path);
        return res.status(400).json(errorResponse("Documento duplicado detectado"));
      }

      // Remover arquivo antigo
      await removerArquivo(documentoAtual.caminho_arquivo);

      // Atualizar informações do arquivo
      caminhoArquivo = arquivo.path;
      tamanhoBytes = arquivo.size;
      mimeType = arquivo.mimetype;
    }

    // Atualizar documento
    const result = await pool.query(
      `UPDATE documentos 
       SET tipo = COALESCE($1, tipo),
           nome = COALESCE($2, nome),
           descricao = COALESCE($3, descricao),
           mime_type = $4,
           tamanho_bytes = $5,
           hash_arquivo = $6,
           caminho_arquivo = $7,
           usuario_upload_id = $8,
           meta_dados = documentos.meta_dados || $9::jsonb
       WHERE id = $10 AND ativo = true 
       RETURNING *`,
      [
        tipo,
        nome,
        descricao,
        mimeType,
        tamanhoBytes,
        hashArquivo,
        caminhoArquivo,
        req.user.id,
        arquivo ? {
          original_name: arquivo.originalname,
          update_ip: req.ip,
          update_date: new Date().toISOString()
        } : {},
        id
      ]
    );

    // Registrar na auditoria
    await registrarEvento(
      'ATUALIZACAO',
      `Atualização de documento: ${nome || documentoAtual.nome}`,
      req.user.id,
      'documentos',
      {
        documento_id: id,
        alteracoes: {
          tipo: tipo !== documentoAtual.tipo,
          nome: nome !== documentoAtual.nome,
          descricao: descricao !== documentoAtual.descricao,
          arquivo: arquivo !== null
        }
      },
      req.ip
    );

    const documentoFormatado = formatObjectDates(result.rows[0], ['data_upload', 'data_atualizacao']);

    res.json(successResponse(documentoFormatado, "Documento atualizado com sucesso"));

  } catch (error) {
    console.error("Update documento error:", error);
    if (req.file) {
      await removerArquivo(req.file.path);
    }
    res.status(500).json(errorResponse("Erro ao atualizar documento"));
  }
});

// Deletar documento
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se documento existe e obter informações
    const checkResult = await pool.query(
      "SELECT * FROM documentos WHERE id = $1 AND ativo = true",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    const documento = checkResult.rows[0];

    // Marcar documento como inativo
    await pool.query(
      `UPDATE documentos 
       SET ativo = false,
           data_atualizacao = CURRENT_TIMESTAMP,
           meta_dados = meta_dados || $1::jsonb
       WHERE id = $2`,
      [
        {
          motivo_exclusao: motivo || "Não especificado",
          excluido_por: req.user.id,
          data_exclusao: new Date().toISOString()
        },
        id
      ]
    );

    // Marcar versões como inativas
    await pool.query(
      "UPDATE versoes_documentos SET ativo = false WHERE documento_id = $1",
      [id]
    );

    // Remover arquivo físico
    await removerArquivo(documento.caminho_arquivo);

    // Registrar na auditoria
    await registrarEvento(
      'EXCLUSAO',
      `Exclusão de documento: ${documento.nome}`,
      req.user.id,
      'documentos',
      {
        documento_id: id,
        motivo: motivo || "Não especificado"
      },
      req.ip
    );

    res.json(successResponse(null, "Documento deletado com sucesso"));

  } catch (error) {
    console.error("Delete documento error:", error);
    res.status(500).json(errorResponse("Erro ao deletar documento"));
  }
});

module.exports = router;
