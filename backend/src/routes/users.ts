import { Router } from "express";
import { UsuariosController } from "../controllers/UsuariosController";
import { authMiddleware } from "../middlewares/authMiddleware";

const usuariosRouter = Router();
const usuariosController = new UsuariosController();

// Aplicar middleware de autenticação em todas as rotas
usuariosRouter.use(authMiddleware);

// Rotas de usuários
usuariosRouter.post("/", usuariosController.criar.bind(usuariosController));
usuariosRouter.get("/", usuariosController.listar.bind(usuariosController));
usuariosRouter.put("/:id", usuariosController.atualizar.bind(usuariosController));
usuariosRouter.delete("/:id", usuariosController.excluir.bind(usuariosController));

export { usuariosRouter };
