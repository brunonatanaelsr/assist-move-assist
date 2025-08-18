const feedDB = require('../db/feed');
const { logger } = require('../middleware/logger');

class FeedService {
  static async listar(params) {
    try {
      const result = await feedDB.findAll(params);
      logger.info('Feed carregado com sucesso', { count: result.data.length });
      return result;
    } catch (error) {
      logger.error('Erro ao carregar feed', { error: error.message });
      throw error;
    }
  }

  static async criar(post) {
    try {
      await this.validarPost(post);

      const novoPost = await feedDB.create(post);
      logger.info('Post criado com sucesso', { id: novoPost.id });
      return novoPost;
    } catch (error) {
      logger.error('Erro ao criar post', { error: error.message });
      throw error;
    }
  }

  static async adicionarComentario(comentario) {
    try {
      await this.validarComentario(comentario);

      const novoComentario = await feedDB.addComment(comentario);
      logger.info('Comentário adicionado com sucesso', { 
        id: novoComentario.id,
        postId: comentario.post_id 
      });
      return novoComentario;
    } catch (error) {
      logger.error('Erro ao adicionar comentário', { error: error.message });
      throw error;
    }
  }

  static async alternarCurtida(postId, usuarioId) {
    try {
      const resultado = await feedDB.toggleLike(postId, usuarioId);
      logger.info(`Curtida ${resultado.action}`, { 
        postId,
        usuarioId 
      });
      return resultado;
    } catch (error) {
      logger.error('Erro ao alternar curtida', {
        postId,
        usuarioId,
        error: error.message
      });
      throw error;
    }
  }

  static async validarPost(post) {
    const erros = [];

    if (!post.conteudo) {
      erros.push('Conteúdo é obrigatório');
    }

    if (!post.tipo) {
      erros.push('Tipo é obrigatório');
    }

    if (!post.autor_id) {
      erros.push('Autor é obrigatório');
    }

    if (erros.length > 0) {
      throw new Error(erros.join(', '));
    }

    return true;
  }

  static async validarComentario(comentario) {
    const erros = [];

    if (!comentario.post_id) {
      erros.push('ID do post é obrigatório');
    }

    if (!comentario.autor_id) {
      erros.push('Autor é obrigatório');
    }

    if (!comentario.conteudo) {
      erros.push('Conteúdo é obrigatório');
    }

    if (erros.length > 0) {
      throw new Error(erros.join(', '));
    }

    return true;
  }
}

module.exports = FeedService;
