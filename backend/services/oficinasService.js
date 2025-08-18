const oficinasDB = require('../db/oficinas');
const beneficiariasDB = require('../db/beneficiarias');
const { logger } = require('../middleware/logger');

class OficinasService {
  static async listar(params) {
    try {
      const result = await oficinasDB.findAll(params);
      logger.info('Oficinas listadas com sucesso', { count: result.data.length });
      return result;
    } catch (error) {
      logger.error('Erro ao listar oficinas', { error: error.message });
      throw error;
    }
  }

  static async buscarPorId(id) {
    try {
      const oficina = await oficinasDB.findById(id);
      
      if (!oficina) {
        logger.warn('Oficina não encontrada', { id });
        return null;
      }
      
      logger.info('Oficina encontrada', { id });
      return oficina;
    } catch (error) {
      logger.error('Erro ao buscar oficina', { id, error: error.message });
      throw error;
    }
  }

  static async criar(dados) {
    try {
      await this.validarDados(dados);

      const oficina = await oficinasDB.create(dados);
      logger.info('Oficina criada com sucesso', { id: oficina.id });
      return oficina;
    } catch (error) {
      logger.error('Erro ao criar oficina', { error: error.message });
      throw error;
    }
  }

  static async atualizar(id, dados) {
    try {
      // Verificar existência
      const existente = await oficinasDB.findById(id);
      if (!existente) {
        logger.warn('Oficina não encontrada para atualização', { id });
        return null;
      }

      await this.validarDados(dados);

      const oficina = await oficinasDB.update(id, dados);
      logger.info('Oficina atualizada com sucesso', { id });
      return oficina;
    } catch (error) {
      logger.error('Erro ao atualizar oficina', { id, error: error.message });
      throw error;
    }
  }

  static async excluir(id) {
    try {
      const oficina = await oficinasDB.delete(id);
      
      if (!oficina) {
        logger.warn('Oficina não encontrada para exclusão', { id });
        return null;
      }
      
      logger.info('Oficina excluída com sucesso', { id });
      return oficina;
    } catch (error) {
      logger.error('Erro ao excluir oficina', { id, error: error.message });
      throw error;
    }
  }

  static async listarParticipantes(id) {
    try {
      const participantes = await oficinasDB.findParticipantes(id);
      logger.info('Participantes listados com sucesso', { 
        oficinaId: id,
        count: participantes.length 
      });
      return participantes;
    } catch (error) {
      logger.error('Erro ao listar participantes', { 
        oficinaId: id, 
        error: error.message 
      });
      throw error;
    }
  }

  static async adicionarParticipante(oficinaId, beneficiariaId) {
    try {
      // Verificar existência da oficina
      const oficina = await oficinasDB.findById(oficinaId);
      if (!oficina) {
        logger.warn('Oficina não encontrada', { oficinaId });
        throw new Error('Oficina não encontrada');
      }

      // Verificar existência da beneficiária
      const beneficiaria = await beneficiariasDB.findById(beneficiariaId);
      if (!beneficiaria) {
        logger.warn('Beneficiária não encontrada', { beneficiariaId });
        throw new Error('Beneficiária não encontrada');
      }

      // Verificar se já está inscrita
      const participantes = await oficinasDB.findParticipantes(oficinaId);
      if (participantes.some(p => p.id === beneficiariaId)) {
        logger.warn('Beneficiária já inscrita na oficina', {
          oficinaId,
          beneficiariaId
        });
        throw new Error('Beneficiária já inscrita nesta oficina');
      }

      // Verificar capacidade máxima
      if (oficina.capacidade_max && participantes.length >= oficina.capacidade_max) {
        logger.warn('Oficina com capacidade máxima atingida', { oficinaId });
        throw new Error('Oficina com capacidade máxima atingida');
      }

      const participacao = await oficinasDB.addParticipante(oficinaId, beneficiariaId);
      logger.info('Participante adicionada com sucesso', {
        oficinaId,
        beneficiariaId
      });
      return participacao;
    } catch (error) {
      logger.error('Erro ao adicionar participante', {
        oficinaId,
        beneficiariaId,
        error: error.message
      });
      throw error;
    }
  }

  static async validarDados(dados) {
    const erros = [];

    if (!dados.titulo) {
      erros.push('Título é obrigatório');
    }

    if (!dados.data_inicio) {
      erros.push('Data de início é obrigatória');
    }

    if (!dados.horario_inicio) {
      erros.push('Horário de início é obrigatório');
    }

    if (dados.capacidade_max && isNaN(dados.capacidade_max)) {
      erros.push('Capacidade máxima deve ser um número');
    }

    if (erros.length > 0) {
      throw new Error(erros.join(', '));
    }

    return true;
  }
}

module.exports = OficinasService;
