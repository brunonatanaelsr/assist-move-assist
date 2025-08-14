const express = require('express');
const { successResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  res.json(successResponse([], "Auditoria em desenvolvimento"));
});

module.exports = router;
