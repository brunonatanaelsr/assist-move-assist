import Joi from 'joi';
import { validate_cpf } from '../utils/cpf-validator';

export const beneficiariaSchema = Joi.object({
  nome_completo: Joi.string()
    .required()
    .min(3)
    .max(100)
    .messages({
      'string.empty': 'O nome completo é obrigatório',
      'string.min': 'O nome deve ter no mínimo {#limit} caracteres',
      'string.max': 'O nome deve ter no máximo {#limit} caracteres'
    }),

  cpf: Joi.string()
    .required()
    .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
    .custom((value, helpers) => {
      if (!validate_cpf(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'string.empty': 'O CPF é obrigatório',
      'string.pattern.base': 'CPF inválido',
      'any.invalid': 'CPF inválido'
    }),

  data_nascimento: Joi.date()
    .required()
    .max('now')
    .min('1900-01-01')
    .messages({
      'date.base': 'Data de nascimento inválida',
      'date.max': 'A data de nascimento não pode ser futura',
      'date.min': 'Data de nascimento inválida'
    }),

  telefone: Joi.string()
    .required()
    .pattern(/^[1-9]{2}9?[0-9]{8}$/)
    .messages({
      'string.empty': 'O telefone é obrigatório',
      'string.pattern.base': 'Telefone inválido'
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty': 'O email é obrigatório',
      'string.email': 'Email inválido'
    }),

  cep: Joi.string()
    .required()
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.empty': 'O CEP é obrigatório',
      'string.pattern.base': 'CEP inválido'
    }),

  endereco: Joi.string()
    .required()
    .min(5)
    .max(200)
    .messages({
      'string.empty': 'O endereço é obrigatório',
      'string.min': 'O endereço deve ter no mínimo {#limit} caracteres',
      'string.max': 'O endereço deve ter no máximo {#limit} caracteres'
    }),

  numero: Joi.string()
    .required()
    .max(10)
    .messages({
      'string.empty': 'O número é obrigatório',
      'string.max': 'O número deve ter no máximo {#limit} caracteres'
    }),

  complemento: Joi.string()
    .allow('')
    .max(100)
    .messages({
      'string.max': 'O complemento deve ter no máximo {#limit} caracteres'
    }),

  bairro: Joi.string()
    .required()
    .max(100)
    .messages({
      'string.empty': 'O bairro é obrigatório',
      'string.max': 'O bairro deve ter no máximo {#limit} caracteres'
    }),

  cidade: Joi.string()
    .required()
    .max(100)
    .messages({
      'string.empty': 'A cidade é obrigatória',
      'string.max': 'A cidade deve ter no máximo {#limit} caracteres'
    }),

  estado: Joi.string()
    .required()
    .length(2)
    .uppercase()
    .messages({
      'string.empty': 'O estado é obrigatório',
      'string.length': 'O estado deve ter 2 caracteres',
      'string.uppercase': 'O estado deve estar em maiúsculo'
    })
});
