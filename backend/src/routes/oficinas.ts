import { Router } from 'express';
import { OficinaController } from '../controllers/OficinaController';

const router = Router();
const controller = new OficinaController();

router.get('/oficinas', controller.listar.bind(controller));
router.get('/oficinas/:id', controller.buscarPorId.bind(controller));
router.post('/oficinas', controller.criar.bind(controller));
router.put('/oficinas/:id', controller.atualizar.bind(controller));
router.delete('/oficinas/:id', controller.excluir.bind(controller));

router.get('/oficinas/:oficina_id/presencas', controller.listarPresencas.bind(controller));
router.post('/oficinas/:oficina_id/presencas/:beneficiaria_id', controller.registrarPresenca.bind(controller));

export default router;
