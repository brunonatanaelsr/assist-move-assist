const express = require('express');
const { successResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireGestor, async (req, res) => {
  res.json(successResponse([], "Declarações em desenvolvimento"));
});

module.exports = router;
