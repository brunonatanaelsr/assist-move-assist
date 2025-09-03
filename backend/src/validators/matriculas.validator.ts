import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Schema de validação para criação de matrícula
export const createMatriculaSchema = Joi.object({
  beneficiaria_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID da beneficiária deve ser um número',
      'number.integer': 'ID da beneficiária deve ser um número inteiro',
      'number.positive': 'ID da beneficiária deve ser positivo',
      'any.required': 'ID da beneficiária é obrigatório'
    }),
    
  projeto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID do projeto deve ser um número',
      'number.integer': 'ID do projeto deve ser um número inteiro', 
      'number.positive': 'ID do projeto deve ser positivo',
      'any.required': 'ID do projeto é obrigatório'
    }),
    
  data_matricula: Joi.date().iso().default(() => new Date())
    .messages({
      'date.format': 'Data de matrícula deve estar no formato ISO (YYYY-MM-DD)'
    }),
    
  data_inicio_prevista: Joi.date().iso().min('now').optional()
    .messages({
      'date.format': 'Data de início deve estar no formato ISO (YYYY-MM-DD)',
      'date.min': 'Data de início não pode ser no passado'
    }),
    
  data_conclusao_prevista: Joi.date().iso().min(Joi.ref('data_inicio_prevista')).optional()
    .messages({
      'date.format': 'Data de conclusão deve estar no formato ISO (YYYY-MM-DD)',
      'date.min': 'Data de conclusão deve ser posterior à data de início'
    }),
    
  // Dados obrigatórios
  motivacao_participacao: Joi.string().min(10).max(1000).required()
    .messages({
      'string.min': 'Motivação deve ter pelo menos 10 caracteres',
      'string.max': 'Motivação deve ter no máximo 1000 caracteres',
      'any.required': 'Motivação é obrigatória'
    }),
    
  expectativas: Joi.string().min(10).max(1000).required()
    .messages({
      'string.min': 'Expectativas devem ter pelo menos 10 caracteres',
      'string.max': 'Expectativas devem ter no máximo 1000 caracteres',
      'any.required': 'Expectativas são obrigatórias'
    }),
    
  // Dados opcionais
  situacao_social_familiar: Joi.string().max(2000).optional(),
  escolaridade_atual: Joi.string().max(100).optional(),
  experiencia_profissional: Joi.string().max(1000).optional(),
  
  // Arrays
  disponibilidade_horarios: Joi.array().items(Joi.string()).max(12).default([])
    .messages({
      'array.max': 'Máximo de 12 horários disponíveis'
    }),
    
  // Booleans com defaults
  possui_dependentes: Joi.boolean().default(false),
  necessita_auxilio_transporte: Joi.boolean().default(false),
  necessita_auxilio_alimentacao: Joi.boolean().default(false),
  necessita_cuidado_criancas: Joi.boolean().default(false),
  
  // Critérios de elegibilidade
  atende_criterios_idade: Joi.boolean().default(true),
  atende_criterios_renda: Joi.boolean().default(true),
  atende_criterios_genero: Joi.boolean().default(true),
  atende_criterios_territorio: Joi.boolean().default(true),
  atende_criterios_vulnerabilidade: Joi.boolean().default(true),
  
  observacoes_elegibilidade: Joi.string().max(1000).optional(),
  
  // Compromissos obrigatórios
  termo_compromisso_assinado: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Termo de compromisso deve ser aceito',
      'any.required': 'Aceitação do termo de compromisso é obrigatória'
    }),
    
  frequencia_minima_aceita: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Frequência mínima deve ser aceita',
      'any.required': 'Aceitação da frequência mínima é obrigatória'
    }),
    
  regras_convivencia_aceitas: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Regras de convivência devem ser aceitas',
      'any.required': 'Aceitação das regras de convivência é obrigatória'
    }),
    
  participacao_atividades_aceita: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Participação ativa deve ser aceita',
      'any.required': 'Aceitação da participação ativa é obrigatória'
    }),
    
  avaliacao_periodica_aceita: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Avaliação periódica deve ser aceita',
      'any.required': 'Aceitação da avaliação periódica é obrigatória'
    }),
    
  // Dados complementares opcionais
  como_conheceu_projeto: Joi.string().max(200).optional(),
  pessoas_referencias: Joi.string().max(1000).optional(),
  condicoes_especiais: Joi.string().max(1000).optional(),
  medicamentos_uso_continuo: Joi.string().max(500).optional(),
  alergias_restricoes: Joi.string().max(500).optional(),
  
  // Dados do profissional
  profissional_matricula: Joi.string().max(100).default('Sistema'),
  observacoes_profissional: Joi.string().max(1000).optional(),
  
  // Status
  status_matricula: Joi.string().valid('pendente', 'aprovada', 'reprovada', 'lista_espera').default('pendente'),
  motivo_status: Joi.string().max(500).optional()
});

// Schema de validação para atualização de matrícula
export const updateMatriculaSchema = Joi.object({
  data_inicio_prevista: Joi.date().iso().optional(),
  data_conclusao_prevista: Joi.date().iso().optional(),
  situacao_social_familiar: Joi.string().max(2000).optional(),
  escolaridade_atual: Joi.string().max(100).optional(),
  experiencia_profissional: Joi.string().max(1000).optional(),
  motivacao_participacao: Joi.string().min(10).max(1000).optional(),
  expectativas: Joi.string().min(10).max(1000).optional(),
  disponibilidade_horarios: Joi.array().items(Joi.string()).max(12).optional(),
  possui_dependentes: Joi.boolean().optional(),
  necessita_auxilio_transporte: Joi.boolean().optional(),
  necessita_auxilio_alimentacao: Joi.boolean().optional(),
  necessita_cuidado_criancas: Joi.boolean().optional(),
  atende_criterios_idade: Joi.boolean().optional(),
  atende_criterios_renda: Joi.boolean().optional(),
  atende_criterios_genero: Joi.boolean().optional(),
  atende_criterios_territorio: Joi.boolean().optional(),
  atende_criterios_vulnerabilidade: Joi.boolean().optional(),
  observacoes_elegibilidade: Joi.string().max(1000).optional(),
  como_conheceu_projeto: Joi.string().max(200).optional(),
  pessoas_referencias: Joi.string().max(1000).optional(),
  condicoes_especiais: Joi.string().max(1000).optional(),
  medicamentos_uso_continuo: Joi.string().max(500).optional(),
  alergias_restricoes: Joi.string().max(500).optional(),
  profissional_matricula: Joi.string().max(100).optional(),
  observacoes_profissional: Joi.string().max(1000).optional(),
  status_matricula: Joi.string().valid('pendente', 'aprovada', 'reprovada', 'lista_espera').optional(),
  motivo_status: Joi.string().max(500).optional()
});

// Schema para verificação de elegibilidade
export const verificarElegibilidadeSchema = Joi.object({
  beneficiaria_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID da beneficiária deve ser um número',
      'number.integer': 'ID da beneficiária deve ser um número inteiro',
      'number.positive': 'ID da beneficiária deve ser positivo',
      'any.required': 'ID da beneficiária é obrigatório'
    }),
    
  projeto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID do projeto deve ser um número',
      'number.integer': 'ID do projeto deve ser um número inteiro',
      'number.positive': 'ID do projeto deve ser positivo',
      'any.required': 'ID do projeto é obrigatório'
    })
});

// Middleware de validação genérico
export const validateRequest = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Retorna todos os erros, não apenas o primeiro
      stripUnknown: true, // Remove campos não definidos no schema
      convert: true // Converte tipos automaticamente quando possível
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Dados de entrada inválidos',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    // Substituir req.body pelos dados validados e sanitizados
    req.body = value;
    next();
  };
};

// Middleware de validação para parâmetros de query
export const validateQuery = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Parâmetros de consulta inválidos',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    req.query = value;
    next();
  };
};

// Schema para parâmetros de listagem
export const listarMatriculasQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  beneficiaria_id: Joi.number().integer().positive().optional(),
  projeto_id: Joi.number().integer().positive().optional(),
  status_matricula: Joi.string().valid('pendente', 'aprovada', 'reprovada', 'lista_espera').optional(),
  data_inicio: Joi.date().iso().optional(),
  data_fim: Joi.date().iso().min(Joi.ref('data_inicio')).optional(),
  search: Joi.string().max(100).optional()
});

// Schema para validação de ID em parâmetros de rota
export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID deve ser um número',
      'number.integer': 'ID deve ser um número inteiro',
      'number.positive': 'ID deve ser positivo',
      'any.required': 'ID é obrigatório'
    })
});

// Middleware para validar parâmetros de rota
export const validateParams = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Parâmetros de rota inválidos',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    req.params = value;
    next();
  };
};
