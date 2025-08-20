// Funções utilitárias para formatação de dados de beneficiárias

import type { Beneficiaria } from '@/types/shared';

export const formatarTelefone = (telefone: string): string => {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `(${numeros.slice(0,2)}) ${numeros.slice(2,7)}-${numeros.slice(7)}`;
    }
    if (numeros.length === 10) {
        return `(${numeros.slice(0,2)}) ${numeros.slice(2,6)}-${numeros.slice(6)}`;
    }
    return telefone;
};

export const formatarCPF = (cpf: string): string => {
    const numeros = cpf.replace(/\D/g, '');
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatarCEP = (cep: string): string => {
    const numeros = cep.replace(/\D/g, '');
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const calcularIdade = (dataNascimento: Date): number => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    if (mesAtual < mesNascimento || 
        (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    
    return idade;
};

export const formatarEndereco = (endereco: Beneficiaria['endereco']): string => {
    if (!endereco) return '';
    
    const partes = [
        endereco.logradouro,
        endereco.numero,
        endereco.complemento,
        endereco.bairro,
        `${endereco.cidade}/${endereco.estado}`,
        formatarCEP(endereco.cep)
    ].filter(Boolean);
    
    return partes.join(', ');
};

export const statusBeneficiariaDisplay = (status: Beneficiaria['status']): string => {
    const displays = {
        ativa: 'Ativa',
        inativa: 'Inativa',
        arquivada: 'Arquivada'
    };
    return displays[status] || status;
};

export const estadoCivilDisplay = (estadoCivil: Beneficiaria['estado_civil']): string => {
    const displays = {
        solteira: 'Solteira',
        casada: 'Casada',
        divorciada: 'Divorciada',
        viuva: 'Viúva',
        uniao_estavel: 'União Estável',
        separada: 'Separada'
    };
    return estadoCivil ? displays[estadoCivil] : '';
};

export const formatarBeneficiaria = (beneficiaria: Beneficiaria): Beneficiaria & {
    statusDisplay: string;
    enderecoDisplay: string;
    telefoneFormatado: string;
    idadeAnos: number;
} => {
    return {
        ...beneficiaria,
        statusDisplay: statusBeneficiariaDisplay(beneficiaria.status),
        enderecoDisplay: formatarEndereco(beneficiaria.endereco),
        telefoneFormatado: formatarTelefone(beneficiaria.telefone),
        idadeAnos: calcularIdade(beneficiaria.data_nascimento)
    };
};
