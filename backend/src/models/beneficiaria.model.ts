export interface Beneficiaria {
    id: number;
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
    criado_em: Date;
    atualizado_em: Date;
    usuario_id?: number;
}

export interface BeneficiariaCreateInput extends Omit<Beneficiaria, 'id' | 'criado_em' | 'atualizado_em'> {}

export interface BeneficiariaUpdateInput extends Partial<Omit<Beneficiaria, 'id' | 'criado_em' | 'atualizado_em' | 'cpf'>> {}
