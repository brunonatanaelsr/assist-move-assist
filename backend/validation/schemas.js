const Joi = require('joi');

// Schemas de validação para diferentes entidades
const schemas = {
  // Schema para autenticação
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),

  // Schema para registro de usuário
  register: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
      .message('A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'),
    confirmPassword: Joi.ref('password')
  }),

  // Schema para atualização de usuário
  updateUser: Joi.object({
    name: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    currentPassword: Joi.string().min(8),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')),
    confirmNewPassword: Joi.ref('newPassword')
  }),

  // Schema para beneficiárias
  beneficiaria: Joi.object({
    nome: Joi.string().min(3).max(100).required(),
    cpf: Joi.string().pattern(/^\d{11}$/).required(),
    dataNascimento: Joi.date().iso().required(),
    telefone: Joi.string().pattern(/^\d{10,11}$/).required(),
    endereco: Joi.object({
      logradouro: Joi.string().required(),
      numero: Joi.string().required(),
      complemento: Joi.string().allow(''),
      bairro: Joi.string().required(),
      cidade: Joi.string().required(),
      estado: Joi.string().length(2).required(),
      cep: Joi.string().pattern(/^\d{8}$/).required()
    })
  }),

  // Schema para oficinas
  oficina: Joi.object({
    titulo: Joi.string().min(3).max(100).required(),
    descricao: Joi.string().min(10).required(),
    dataInicio: Joi.date().iso().required(),
    dataFim: Joi.date().iso().min(Joi.ref('dataInicio')).required(),
    vagas: Joi.number().integer().min(1).required(),
    local: Joi.string().required(),
    status: Joi.string().valid('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')
  }),

  // Schema para participações
  participacao: Joi.object({
    beneficiariaId: Joi.number().integer().required(),
    oficinaId: Joi.number().integer().required(),
    status: Joi.string().valid('INSCRITA', 'CONFIRMADA', 'PRESENTE', 'AUSENTE', 'DESISTENTE')
  })
};

module.exports = schemas;
