import { Request, Response, NextFunction } from "express";
import { PermissaoService } from "../services/PermissaoService";

export const verificarPermissao = (recurso: string, acao: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const permissaoService = new PermissaoService();
            const usuarioId = req.user?.id;

            if (!usuarioId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            const temPermissao = await permissaoService.verificarPermissao(
                usuarioId,
                recurso,
                acao
            );

            if (!temPermissao) {
                return res.status(403).json({ error: "Acesso não autorizado" });
            }

            next();
        } catch (error) {
            console.error("Erro ao verificar permissão:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    };
};

// Decorator para TypeScript
export function RequirePermission(recurso: string, acao: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const [req, res] = args;
            
            const permissaoService = new PermissaoService();
            const usuarioId = req.user?.id;

            if (!usuarioId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            const temPermissao = await permissaoService.verificarPermissao(
                usuarioId,
                recurso,
                acao
            );

            if (!temPermissao) {
                return res.status(403).json({ error: "Acesso não autorizado" });
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
