const Joi = require('joi');
const xss = require('xss');
const { cpf } = require('cpf-cnpj-validator');

// Esquemas de validação básicos
const commonSchemas = {
  id: Joi.number().integer().positive(),
  email: Joi.string().email().max(255).lowercase().required(),
  password: Joi.string().min(8).max(72).required(), // 72 é o limite do bcrypt
  name: Joi.string().min(2).max(255).required(),
  date: Joi.date().iso(),
  cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
  phone: Joi.string().pattern(/^\d{10,11}$/).required(),
  cep: Joi.string().length(8).pattern(/^\d+$/).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().max(255).allow(''),
  status: Joi.string().valid('ATIVO', 'INATIVO', 'PENDENTE', 'BLOQUEADO')
};

// Esquemas específicos
const schemas = {
  auth: {
    login: Joi.object({
      email: commonSchemas.email,
      password: commonSchemas.password
    }),
    register: Joi.object({
      name: commonSchemas.name,
      email: commonSchemas.email,
      password: commonSchemas.password,
      confirmPassword: Joi.ref('password')
    })
  },

  beneficiarias: {
    create: Joi.object({
      nomeCompleto: commonSchemas.name,
      cpf: commonSchemas.cpf,
      dataNascimento: commonSchemas.date,
      telefone: commonSchemas.phone,
      email: commonSchemas.email.allow(null),
      endereco: Joi.object({
        logradouro: Joi.string().required(),
        numero: Joi.string().required(),
        complemento: Joi.string().allow(''),
        bairro: Joi.string().required(),
        cidade: Joi.string().required(),
        estado: Joi.string().length(2).required(),
        cep: commonSchemas.cep
      })
    }),
    update: Joi.object({
      nomeCompleto: commonSchemas.name,
      telefone: commonSchemas.phone,
      email: commonSchemas.email.allow(null),
      endereco: Joi.object({
        logradouro: Joi.string(),
        numero: Joi.string(),
        complemento: Joi.string().allow(''),
        bairro: Joi.string(),
        cidade: Joi.string(),
        estado: Joi.string().length(2),
        cep: commonSchemas.cep
      })
    }),
    query: Joi.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      search: commonSchemas.search,
      status: commonSchemas.status,
      bairro: Joi.string().max(100)
    })
  }
};

// Funções de sanitização
const sanitizers = {
  // Sanitização básica de texto
  text: (value) => {
    if (!value) return value;
    return xss(value.trim());
  },

  // Sanitização de CPF
  cpf: (value) => {
    if (!value) return value;
    return value.replace(/\D/g, '');
  },

  // Sanitização de telefone
  phone: (value) => {
    if (!value) return value;
    return value.replace(/\D/g, '');
  },

  // Sanitização de CEP
  cep: (value) => {
    if (!value) return value;
    return value.replace(/\D/g, '');
  },

  // Sanitização de email
  email: (value) => {
    if (!value) return value;
    return value.toLowerCase().trim();
  },

  // Sanitização de objeto de endereço
  address: (address) => {
    if (!address) return address;
    return {
      logradouro: sanitizers.text(address.logradouro),
      numero: sanitizers.text(address.numero),
      complemento: sanitizers.text(address.complemento),
      bairro: sanitizers.text(address.bairro),
      cidade: sanitizers.text(address.cidade),
      estado: sanitizers.text(address.estado),
      cep: sanitizers.cep(address.cep)
    };
  }
};

// Middleware de validação
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos',
        errors
      });
    }

    // Sanitizar dados validados
    req[property] = sanitizeData(value);
    next();
  };
};

// Função auxiliar para sanitizar dados recursivamente
function sanitizeData(data) {
  if (!data) return data;

  if (typeof data === 'string') {
    return sanitizers.text(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'cpf') sanitized[key] = sanitizers.cpf(value);
      else if (key === 'telefone') sanitized[key] = sanitizers.phone(value);
      else if (key === 'email') sanitized[key] = sanitizers.email(value);
      else if (key === 'endereco') sanitized[key] = sanitizers.address(value);
      else sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }

  return data;
}

module.exports = {
  schemas,
  validate,
  sanitizers
};
