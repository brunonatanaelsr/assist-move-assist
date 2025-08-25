const express = require('express');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// Configurações do Sistema
router.get('/sistema', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracoes_sistema ORDER BY chave');
    res.json(successResponse(result.rows));
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

router.put('/sistema/:chave', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { chave } = req.params;
    const { valor } = req.body;
    
    await pool.query(
      'UPDATE configuracoes_sistema SET valor = $1, updated_at = CURRENT_TIMESTAMP WHERE chave = $2',
      [valor, chave]
    );
    
    res.json(successResponse({ chave, valor }, 'Configuração atualizada com sucesso'));
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Gerenciamento de Usuários
router.get('/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, p.nome as perfil_nome
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      ORDER BY u.nome
    `);
    res.json(successResponse(result.rows));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

router.post('/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { nome, email, senha_hash, papel, telefone, perfil_id } = req.body;
    
    const userResult = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, telefone, perfil_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nome, email, papel, telefone, perfil_id`,
      [nome, email, senha_hash, papel, telefone, perfil_id]
    );

    await client.query('COMMIT');
    res.status(201).json(successResponse(userResult.rows[0], 'Usuário criado com sucesso'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar usuário:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  } finally {
    client.release();
  }
});

router.put('/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { nome, email, papel, telefone, perfil_id, ativo } = req.body;
    
    const result = await client.query(
      `UPDATE usuarios 
       SET nome = $1, email = $2, papel = $3, telefone = $4, perfil_id = $5, ativo = $6, data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, nome, email, papel, telefone, perfil_id, ativo`,
      [nome, email, papel, telefone, perfil_id, ativo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Usuário não encontrado'));
    }

    await client.query('COMMIT');
    res.json(successResponse(result.rows[0], 'Usuário atualizado com sucesso'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  } finally {
    client.release();
  }
});

router.delete('/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Inativar em vez de deletar
    const result = await client.query(
      'UPDATE usuarios SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Usuário não encontrado'));
    }

    await client.query('COMMIT');
    res.json(successResponse(null, 'Usuário inativado com sucesso'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao inativar usuário:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  } finally {
    client.release();
  }
});

// Gerenciamento de Permissões
router.get('/permissoes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pp.*, p.nome as perfil_nome, pe.nome as permissao_nome, pe.modulo
      FROM perfil_permissoes pp
      JOIN perfis p ON pp.perfil_id = p.id
      JOIN permissoes pe ON pp.permissao_id = pe.id
      ORDER BY p.nome, pe.modulo
    `);
    res.json(successResponse(result.rows));
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

router.post('/permissoes', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { perfil_id, permissao_id } = req.body;
    
    // Verificar se já existe
    const existingResult = await client.query(
      'SELECT id FROM perfil_permissoes WHERE perfil_id = $1 AND permissao_id = $2',
      [perfil_id, permissao_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json(errorResponse('Permissão já existe para este perfil'));
    }

    const result = await client.query(
      'INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES ($1, $2) RETURNING *',
      [perfil_id, permissao_id]
    );

    await client.query('COMMIT');
    res.status(201).json(successResponse(result.rows[0], 'Permissão adicionada com sucesso'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao adicionar permissão:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  } finally {
    client.release();
  }
});

router.delete('/permissoes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const result = await client.query(
      'DELETE FROM perfil_permissoes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Permissão não encontrada'));
    }

    await client.query('COMMIT');
    res.json(successResponse(null, 'Permissão removida com sucesso'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover permissão:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  } finally {
    client.release();
  }
});

module.exports = router;
