const express = require('express');
const { successResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Placeholder para mensagens
router.get('/', authenticateToken, async (req, res) => {
  res.json(successResponse([], "Mensagens carregadas com sucesso"));
});

module.exports = router;
