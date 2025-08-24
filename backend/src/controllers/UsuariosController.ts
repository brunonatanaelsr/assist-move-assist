import { Request, Response } from "express";
import { UsuarioService } from "../services/UsuarioService";
import { RequirePermission } from "../middlewares/permissionMiddleware";

export class UsuariosController {
    private usuarioService: UsuarioService;

    constructor() {
        this.usuarioService = new UsuarioService();
    }

    @RequirePermission("usuarios", "CREATE")
    async criar(req: Request, res: Response): Promise<Response> {
        try {
            const usuario = await this.usuarioService.criar(req.body);
            return res.status(201).json(usuario);
        } catch (error) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    @RequirePermission("usuarios", "READ")
    async listar(req: Request, res: Response): Promise<Response> {
        try {
            const usuarios = await this.usuarioService.listar();
            return res.json(usuarios);
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    @RequirePermission("usuarios", "UPDATE")
    async atualizar(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const usuario = await this.usuarioService.atualizar(Number(id), req.body);
            return res.json(usuario);
        } catch (error) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    @RequirePermission("usuarios", "DELETE")
    async excluir(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await this.usuarioService.excluir(Number(id));
            return res.status(204).send();
        } catch (error) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
