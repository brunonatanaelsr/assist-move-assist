const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1');
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbResult.rows ? 'connected' : 'error',
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      db: 'disconnected'
    });
  }
});

module.exports = router;
