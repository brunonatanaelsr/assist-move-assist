const Joi = require('joi');
const { cpf: validateCPF } = require('cpf-cnpj-validator');

// Schema para validação de beneficiária
const beneficiariaSchema = Joi.object({
  nome_completo: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Nome completo é obrigatório',
      'string.min': 'Nome completo deve ter no mínimo 3 caracteres',
      'string.max': 'Nome completo deve ter no máximo 100 caracteres'
    }),

  cpf: Joi.string()
    .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
    .required()
    .custom((value, helpers) => {
      if (!validateCPF.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'CPF deve estar no formato 999.999.999-99',
      'any.invalid': 'CPF inválido'
    }),

  rg: Joi.string()
    .pattern(/^[0-9]{2}\.[0-9]{3}\.[0-9]{3}-[0-9xX]$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'RG deve estar no formato 99.999.999-9'
    }),

  data_nascimento: Joi.date()
    .max('now')
    .messages({
      'date.max': 'Data de nascimento não pode ser futura'
    }),

  telefone: Joi.string()
    .pattern(/^[1-9]{2}(?:[2-8]|9[0-9])[0-9]{3}[0-9]{4}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Telefone deve estar no formato DDD999999999'
    }),

  endereco: Joi.string()
    .max(200)
    .allow(null, '')
    .messages({
      'string.max': 'Endereço deve ter no máximo 200 caracteres'
    }),

  cep: Joi.string()
    .pattern(/^[0-9]{5}-[0-9]{3}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 99999-999'
    }),

  cidade: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Cidade deve ter no máximo 100 caracteres'
    }),

  estado: Joi.string()
    .length(2)
    .allow(null, '')
    .messages({
      'string.length': 'Estado deve ser a sigla com 2 caracteres'
    }),

  status: Joi.string()
    .valid('ativa', 'inativa', 'aguardando', 'bloqueada')
    .default('ativa')
    .messages({
      'any.only': 'Status deve ser: ativa, inativa, aguardando ou bloqueada'
    })
});

module.exports = {
  validateBeneficiaria: (data) => beneficiariaSchema.validate(data, {
    abortEarly: false,
    allowUnknown: true
  })
};
