import { Repository } from "typeorm";
import { Permissao } from "../models/Permissao";
import { AppDataSource } from "../data-source";
import { AppError } from "../errors/AppError";

export class PermissaoService {
    private permissaoRepository: Repository<Permissao>;

    constructor() {
        this.permissaoRepository = AppDataSource.getRepository(Permissao);
    }

    async verificarPermissao(usuarioId: number, recurso: string, acao: string): Promise<boolean> {
        const usuario = await AppDataSource
            .getRepository("usuarios")
            .findOne({
                where: { id: usuarioId },
                relations: ["perfil", "perfil.permissoes"]
            });

        if (!usuario || !usuario.perfil) {
            return false;
        }

        return usuario.perfil.permissoes.some(
            permissao => permissao.recurso === recurso && permissao.acao === acao
        );
    }

    async listarPermissoes(): Promise<Permissao[]> {
        return this.permissaoRepository.find();
    }

    async buscarPorId(id: number): Promise<Permissao | null> {
        return this.permissaoRepository.findOne({ where: { id } });
    }

    async buscarPorRecursoEAcao(recurso: string, acao: string): Promise<Permissao | null> {
        return this.permissaoRepository.findOne({
            where: { recurso, acao }
        });
    }
}
