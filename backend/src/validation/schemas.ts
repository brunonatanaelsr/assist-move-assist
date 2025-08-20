import * as Joi from 'joi';

// Schema para criação de beneficiária
export const createBeneficiariaSchema = Joi.object({
    nome_completo: Joi.string().required().min(3).max(100),
    cpf: Joi.string().required().pattern(/^\d{11}$/),
    data_nascimento: Joi.date().required().max('now'),
    telefone: Joi.string().required().pattern(/^\d{10,11}$/),
    email: Joi.string().email().allow('').optional(),
    endereco: Joi.object({
        cep: Joi.string().required().pattern(/^\d{8}$/),
        logradouro: Joi.string().required().min(3).max(100),
        numero: Joi.string().required(),
        complemento: Joi.string().allow('').optional(),
        bairro: Joi.string().required(),
        cidade: Joi.string().required(),
        estado: Joi.string().required().length(2)
    }).required()
});

// Schema para atualização de beneficiária
export const updateBeneficiariaSchema = createBeneficiariaSchema.keys({
    status: Joi.string().valid('ativa', 'inativa', 'arquivada')
});

// Schema para criação de oficina
export const createOficinaSchema = Joi.object({
    titulo: Joi.string().required().min(3).max(100),
    descricao: Joi.string().required(),
    data_inicio: Joi.date().required().min('now'),
    data_fim: Joi.date().min(Joi.ref('data_inicio')).allow(null),
    horario_inicio: Joi.string().required().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    horario_fim: Joi.string().required().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    dias_semana: Joi.array().items(
        Joi.string().valid('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')
    ).min(1).required(),
    vagas_total: Joi.number().integer().min(1).required(),
    projeto_id: Joi.number().integer().required(),
    responsavel_id: Joi.number().integer().required()
});

// Schema para atualização de oficina
export const updateOficinaSchema = createOficinaSchema.keys({
    status: Joi.string().valid('ativa', 'inativa', 'cancelada', 'concluida')
});

// Schema para criação de projeto
export const createProjetoSchema = Joi.object({
    titulo: Joi.string().required().min(3).max(100),
    descricao: Joi.string().required(),
    data_inicio: Joi.date().required().min('now'),
    data_fim: Joi.date().min(Joi.ref('data_inicio')).allow(null),
    coordenador_id: Joi.number().integer().required()
});

// Schema para atualização de projeto
export const updateProjetoSchema = createProjetoSchema.keys({
    status: Joi.string().valid('ativo', 'inativo', 'concluido')
});
