import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { IsString, IsEnum } from "class-validator";

export enum AcaoPermissao {
    CREATE = "CREATE",
    READ = "READ",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    MANAGE_ATTENDANCE = "MANAGE_ATTENDANCE",
    MODERATE = "MODERATE",
    APPROVE = "APPROVE"
}

@Entity("permissoes")
export class Permissao {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    nome: string;

    @Column({ type: "text", nullable: true })
    descricao: string;

    @Column()
    @IsString()
    recurso: string;

    @Column({
        type: "enum",
        enum: AcaoPermissao
    })
    @IsEnum(AcaoPermissao)
    acao: AcaoPermissao;

    @CreateDateColumn()
    created_at: Date;
}
