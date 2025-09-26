import { BaseEntity } from '../repositories/base.repository';

export interface Beneficiaria extends BaseEntity {
    nome: string;
    cpf: string;
    rg?: string;
    data_nascimento: Date;
    telefone?: string;
    telefone_emergencia?: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    escolaridade?: string;
    estado_civil?: string;
    numero_filhos: number;
    renda_familiar?: number;
    situacao_moradia?: string;
    status: 'ativa' | 'inativa' | 'pendente' | 'desistente';
    observacoes?: string;
    usuario_id?: number;
}

export interface CreateBeneficiariaDTO extends Omit<Beneficiaria, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

export interface UpdateBeneficiariaDTO extends Partial<Omit<Beneficiaria, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'cpf'>> {}
