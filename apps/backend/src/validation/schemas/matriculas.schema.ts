import { z } from 'zod';

const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const requireTrue = (message: string) =>
  z.boolean().refine((value) => value === true, { message });

const anyOptional = z.any().optional();
const emptyObject = z.object({}).optional();

export const matriculaBaseBodySchema = z
  .object({
    beneficiaria_id: z.coerce.number().int().positive(),
    projeto_id: z.coerce.number().int().positive(),
    data_matricula: z.coerce.date().default(() => new Date()),
    data_inicio_prevista: z.coerce.date().optional(),
    data_conclusao_prevista: z.coerce.date().optional(),
    motivacao_participacao: z.string().trim().min(10).max(1000),
    expectativas: z.string().trim().min(10).max(1000),
    situacao_social_familiar: z.string().trim().max(2000).optional(),
    escolaridade_atual: z.string().trim().max(100).optional(),
    experiencia_profissional: z.string().trim().max(1000).optional(),
    disponibilidade_horarios: z.array(z.string().trim()).max(12).default([]),
    possui_dependentes: z.boolean().default(false),
    necessita_auxilio_transporte: z.boolean().default(false),
    necessita_auxilio_alimentacao: z.boolean().default(false),
    necessita_cuidado_criancas: z.boolean().default(false),
    atende_criterios_idade: z.boolean().default(true),
    atende_criterios_renda: z.boolean().default(true),
    atende_criterios_genero: z.boolean().default(true),
    atende_criterios_territorio: z.boolean().default(true),
    atende_criterios_vulnerabilidade: z.boolean().default(true),
    observacoes_elegibilidade: z.string().trim().max(1000).optional(),
    termo_compromisso_assinado: requireTrue('Termo de compromisso deve ser aceito'),
    frequencia_minima_aceita: requireTrue('Frequência mínima deve ser aceita'),
    regras_convivencia_aceitas: requireTrue('Regras de convivência devem ser aceitas'),
    participacao_atividades_aceita: requireTrue('Participação ativa deve ser aceita'),
    avaliacao_periodica_aceita: requireTrue('Avaliação periódica deve ser aceita'),
    como_conheceu_projeto: z.string().trim().max(200).optional(),
    pessoas_referencias: z.string().trim().max(1000).optional(),
    condicoes_especiais: z.string().trim().max(1000).optional(),
    medicamentos_uso_continuo: z.string().trim().max(500).optional(),
    alergias_restricoes: z.string().trim().max(500).optional(),
    profissional_matricula: z.string().trim().max(100).default('Sistema'),
    observacoes_profissional: z.string().trim().max(1000).optional(),
    status_matricula: z
      .enum(['pendente', 'aprovada', 'reprovada', 'lista_espera'])
      .default('pendente'),
    motivo_status: z.string().trim().max(500).optional()
  })
  .superRefine((data, ctx) => {
    if (data.data_inicio_prevista && data.data_inicio_prevista < startOfToday()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_inicio_prevista'],
        message: 'Data de início não pode ser no passado'
      });
    }

    if (
      data.data_conclusao_prevista &&
      data.data_inicio_prevista &&
      data.data_conclusao_prevista < data.data_inicio_prevista
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_conclusao_prevista'],
        message: 'Data de conclusão deve ser posterior à data de início'
      });
    }
  });

export const createMatriculaRequestSchema = z.object({
  body: matriculaBaseBodySchema,
  query: anyOptional,
  params: emptyObject
});

export const updateMatriculaBodySchema = matriculaBaseBodySchema.partial();

export const updateMatriculaRequestSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: updateMatriculaBodySchema,
  query: anyOptional
});

export const verificarElegibilidadeRequestSchema = z.object({
  body: z.object({
    beneficiaria_id: z.coerce.number().int().positive(),
    projeto_id: z.coerce.number().int().positive()
  }),
  params: emptyObject,
  query: anyOptional
});

export const listarMatriculasRequestSchema = z
  .object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      beneficiaria_id: z.coerce.number().int().positive().optional(),
      projeto_id: z.coerce.number().int().positive().optional(),
      status_matricula: z
        .enum(['pendente', 'aprovada', 'reprovada', 'lista_espera'])
        .optional(),
      data_inicio: z.coerce.date().optional(),
      data_fim: z.coerce.date().optional(),
      search: z.string().trim().max(100).optional()
    }),
    params: emptyObject,
    body: anyOptional
  })
  .superRefine((data, ctx) => {
    const { data_inicio, data_fim } = data.query;
    if (data_inicio && data_fim && data_fim < data_inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['query', 'data_fim'],
        message: 'Data final deve ser posterior à data inicial'
      });
    }
  });

export const matriculaIdRequestSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: anyOptional,
  body: anyOptional
});
