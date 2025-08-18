const beneficiariasDB = require('../db/beneficiarias');
const { logger } = require('../middleware/logger');

class BeneficiariasService {
  static async listar(params) {
    try {
      const result = await beneficiariasDB.findAll(params);
      logger.info('Beneficiárias listadas com sucesso', { count: result.data.length });
      return result;
    } catch (error) {
      logger.error('Erro ao listar beneficiárias', { error: error.message });
      throw error;
    }
  }

  static async buscarPorId(id) {
    try {
      const beneficiaria = await beneficiariasDB.findById(id);
      
      if (!beneficiaria) {
        logger.warn('Beneficiária não encontrada', { id });
        return null;
      }
      
      logger.info('Beneficiária encontrada', { id });
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao buscar beneficiária', { id, error: error.message });
      throw error;
    }
  }

  static async criar(dados) {
    try {
      // Validar CPF único
      if (dados.cpf) {
        const existente = await beneficiariasDB.findByCpf(dados.cpf);
        if (existente) {
          logger.warn('CPF já cadastrado', { cpf: dados.cpf });
          throw new Error('CPF já cadastrado');
        }
      }

      const beneficiaria = await beneficiariasDB.create(dados);
      logger.info('Beneficiária criada com sucesso', { id: beneficiaria.id });
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao criar beneficiária', { error: error.message });
      throw error;
    }
  }

  static async atualizar(id, dados) {
    try {
      // Verificar existência
      const existente = await beneficiariasDB.findById(id);
      if (!existente) {
        logger.warn('Beneficiária não encontrada para atualização', { id });
        return null;
      }

      // Validar CPF único
      if (dados.cpf && dados.cpf !== existente.cpf) {
        const cpfExistente = await beneficiariasDB.findByCpf(dados.cpf);
        if (cpfExistente) {
          logger.warn('CPF já cadastrado para outra beneficiária', { cpf: dados.cpf });
          throw new Error('CPF já cadastrado para outra beneficiária');
        }
      }

      const beneficiaria = await beneficiariasDB.update(id, dados);
      logger.info('Beneficiária atualizada com sucesso', { id });
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao atualizar beneficiária', { id, error: error.message });
      throw error;
    }
  }

  static async excluir(id) {
    try {
      const beneficiaria = await beneficiariasDB.delete(id);
      
      if (!beneficiaria) {
        logger.warn('Beneficiária não encontrada para exclusão', { id });
        return null;
      }
      
      logger.info('Beneficiária excluída com sucesso', { id });
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao excluir beneficiária', { id, error: error.message });
      throw error;
    }
  }

  static async validarDados(dados) {
    const erros = [];

    if (!dados.nome_completo) {
      erros.push('Nome completo é obrigatório');
    }

    if (dados.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(dados.cpf)) {
      erros.push('CPF inválido');
    }

    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      erros.push('Email inválido');
    }

    if (erros.length > 0) {
      throw new Error(erros.join(', '));
    }

    return true;
  }
}

module.exports = BeneficiariasService;
