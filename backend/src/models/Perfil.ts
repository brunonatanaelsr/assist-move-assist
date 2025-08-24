import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from "typeorm";
import { IsString, Length } from "class-validator";
import { Permissao } from "./Permissao";

@Entity("perfis")
export class Perfil {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    @Length(3, 50)
    nome: string;

    @Column({ type: "text", nullable: true })
    descricao: string;

    @ManyToMany(() => Permissao)
    @JoinTable({
        name: "perfil_permissoes",
        joinColumn: { name: "perfil_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "permissao_id", referencedColumnName: "id" }
    })
    permissoes: Permissao[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
