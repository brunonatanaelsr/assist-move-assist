import { Router } from 'express';
import { checkDbConnection } from '../config/database';
import os from 'os';

const router = Router();

// Health check básico
router.get('/', async (req, res) => {
  try {
    // Verificar conexão com o banco de dados
    const dbStatus = await checkDbConnection();
    
    // Verificar uso de memória
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024),
      usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
    };
    
    // Verificar uso de CPU
    const cpuUsage = process.cpuUsage();
    const uptime = Math.round(process.uptime());
    
    // Verificar carga do sistema
    const loadAverage = os.loadavg();
    
    // Status geral do sistema
    const status = dbStatus.success ? 'healthy' : 'unhealthy';
    const httpStatus = dbStatus.success ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: `${uptime}s`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      db: dbStatus,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        heapUsedPercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
      },
      system: {
        memory: systemMemory,
        cpu: {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000)
        },
        loadAverage: {
          '1min': (loadAverage[0] || 0).toFixed(2),
          '5min': (loadAverage[1] || 0).toFixed(2),
          '15min': (loadAverage[2] || 0).toFixed(2)
        },
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error?.message || 'Erro desconhecido'
    });
  }
});

// Health check específico do banco de dados
router.get('/db', async (req, res) => {
  try {
    const dbStatus = await checkDbConnection();
    res.status(dbStatus.success ? 200 : 503).json(dbStatus);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check de recursos (memória, CPU)
router.get('/resources', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const systemMemory = {
    total: Math.round(os.totalmem() / 1024 / 1024),
    free: Math.round(os.freemem() / 1024 / 1024),
    used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
  };
  
  const cpus = os.cpus();
  const loadAverage = os.loadavg();
  
  // Determinar status baseado em limites
  const memoryUsagePercent = (systemMemory.used / systemMemory.total) * 100;
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  let status = 'healthy';
  if (memoryUsagePercent > 85 || heapUsagePercent > 85 || (loadAverage[0] || 0) > cpus.length * 2) {
    status = 'warning';
  }
  if (memoryUsagePercent > 95 || heapUsagePercent > 95 || (loadAverage[0] || 0) > cpus.length * 4) {
    status = 'critical';
  }
  
  res.json({
    status,
    timestamp: new Date().toISOString(),
    memory: {
      heap: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: heapUsagePercent.toFixed(2)
      },
      system: {
        ...systemMemory,
        percentage: memoryUsagePercent.toFixed(2)
      }
    },
    cpu: {
      count: cpus.length,
      model: cpus[0]?.model || 'N/A',
      loadAverage: {
        '1min': (loadAverage[0] || 0).toFixed(2),
        '5min': (loadAverage[1] || 0).toFixed(2),
        '15min': (loadAverage[2] || 0).toFixed(2)
      }
    },
    uptime: {
      process: Math.round(process.uptime()),
      system: Math.round(os.uptime())
    }
  });
});

export default router;
