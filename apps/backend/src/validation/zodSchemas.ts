import { z } from 'zod';

// Schema base para beneficiária
export const beneficiariaSchema = z.object({
    nome_completo: z.string().min(3).max(100),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
    data_nascimento: z.string().datetime(),
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
    email: z.string().email().optional().nullable(),
    endereco: z.object({
        cep: z.string().regex(/^\d{8}$/, 'CEP deve conter 8 dígitos'),
        logradouro: z.string().min(3).max(100),
        numero: z.string(),
        complemento: z.string().optional(),
        bairro: z.string(),
        cidade: z.string(),
        estado: z.string().length(2)
    }),
    status: z.enum(['ativa', 'inativa', 'arquivada']).default('ativa')
});

// Schema para oficina
export const oficinaSchema = z.object({
    titulo: z.string().min(3).max(100),
    descricao: z.string(),
    data_inicio: z.string().datetime(),
    data_fim: z.string().datetime().nullable(),
    horario_inicio: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido de hora'),
    horario_fim: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido de hora'),
    dias_semana: z.array(
        z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'])
    ).min(1),
    vagas_total: z.number().int().positive(),
    projeto_id: z.number().int().positive(),
    responsavel_id: z.number().int().positive(),
    status: z.enum(['ativa', 'inativa', 'cancelada', 'concluida']).default('ativa')
});

// Schema para projeto
export const projetoSchema = z.object({
    titulo: z.string().min(3).max(100),
    descricao: z.string(),
    data_inicio: z.string().datetime(),
    data_fim: z.string().datetime().nullable(),
    coordenador_id: z.number().int().positive(),
    status: z.enum(['ativo', 'inativo', 'concluido']).default('ativo')
});

// Schema para inscrição em oficina
export const inscricaoOficinaSchema = z.object({
    beneficiaria_id: z.number().int().positive(),
    oficina_id: z.number().int().positive(),
    data_inscricao: z.string().datetime().default(() => new Date().toISOString()),
    status: z.enum(['pendente', 'confirmada', 'cancelada']).default('pendente'),
    observacoes: z.string().optional()
});

// Schema para presença
export const presencaSchema = z.object({
    inscricao_id: z.number().int().positive(),
    data_aula: z.string().datetime(),
    presente: z.boolean(),
    observacoes: z.string().optional()
});

// Tipos TypeScript inferidos dos schemas
export type Beneficiaria = z.infer<typeof beneficiariaSchema>;
export type Oficina = z.infer<typeof oficinaSchema>;
export type Projeto = z.infer<typeof projetoSchema>;
export type InscricaoOficina = z.infer<typeof inscricaoOficinaSchema>;
export type Presenca = z.infer<typeof presencaSchema>;
