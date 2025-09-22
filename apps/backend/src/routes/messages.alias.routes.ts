import { Router } from 'express';
import mensagensRoutes from './mensagens.routes';

// Alias para compatibilidade: /api/messages -> delega para /api/mensagens
const router = Router();

// Encaminhar raiz para conversas
router.get('/', (req, res, next) => {
  // Reescreve URL para rota equivalente em português
  req.url = '/conversas';
  (mensagensRoutes as any).handle(req, res, next);
});

// Encaminhar demais subrotas de forma simples
router.use((req, res, next) => {
  req.url = req.originalUrl.replace('/api/messages', '');
  (mensagensRoutes as any).handle(req, res, next);
});

export default router;

