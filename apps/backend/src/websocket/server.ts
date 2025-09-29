import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../services/logger';
import { config } from '../config';
import { redis } from '../lib/redis';
import { applyUnreadRetention } from './retention';

interface User {
  id: string;
  nome: string;
  email: string;
}

interface SocketData {
  user: User;
}

export class WebSocketServer {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    server: HttpServer,
    private pool: Pool
  ) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });

    this.setupAuthentication();
    this.setupPostgresListeners();
    this.setupConnectionHandlers();
  }

  private setupAuthentication() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Token não fornecido'));
        }

        // Validação do token JWT usando a chave correta do config
        const decoded = jwt.verify(token, config.jwt.secret) as User;
        (socket as Socket & { data: SocketData }).data = {
          user: decoded
        };

        next();
      } catch (error) {
        next(new Error('Token inválido'));
      }
    });
  }

  private async setupPostgresListeners() {
    const client = await this.pool.connect();
    
    try {
      await client.query('LISTEN feed_notifications');
      
      client.on('notification', (msg) => {
        if (!msg.payload) return;

        const data = JSON.parse(msg.payload);
        this.handleDatabaseNotification(data);
      });

      logger.info('PostgreSQL notification listeners configurados');
    } catch (error) {
      logger.error('Erro ao configurar listeners PostgreSQL:', error);
      throw error;
    }
  }

  private setupConnectionHandlers() {
    this.io.on('connection', (socket: Socket & { data: SocketData }) => {
      const userId = socket.data.user.id;

      // Adicionar socket à lista do usuário
      const userSockets = this.userSockets.get(userId) || [];
      userSockets.push(socket.id);
      this.userSockets.set(userId, userSockets);

      // Entrar na sala do usuário
      socket.join(`user:${userId}`);

      // Enviar notificações não lidas
      this.sendUnreadNotifications(userId, socket);
      // Enviar mensagens de chat não lidas
      this.sendUnreadChatMessages(userId, socket);

      logger.info(`Usuário ${userId} conectado via WebSocket`);

      // Broadcast status online
      this.io.emit('user_status', { userId, status: 'online' });

      socket.on('disconnect', () => {
        const sockets = this.userSockets.get(userId) || [];
        const newSockets = sockets.filter(id => id !== socket.id);
        
        if (newSockets.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, newSockets);
        }

        // Limpar digitação
        this.clearTyping(userId);

        logger.info(`Usuário ${userId} desconectado do WebSocket`);

        // Broadcast status offline
        if (!this.userSockets.has(userId)) {
          this.io.emit('user_status', { userId, status: 'offline' });
        }
      });

      // Notificações de digitação
      socket.on('typing:start', (data: { postId: string }) => {
        this.handleTypingStart(socket, data.postId);
      });

      socket.on('typing:stop', (data: { postId: string }) => {
        this.handleTypingStop(socket, data.postId);
      });

      // Gerenciamento de salas
      socket.on('post:join', (postId: string) => {
        socket.join(`post:${postId}`);
      });

      socket.on('post:leave', (postId: string) => {
        socket.leave(`post:${postId}`);
      });

      // Marcação de notificações como lidas
      socket.on('notification:read', async (notificationId: string) => {
        await this.markNotificationAsRead(userId, notificationId);
      });

      // Chat: alinhar com useSocket.ts
      socket.on('join_groups', async () => {
        try {
          const groups = await this.pool.query(
            `SELECT grupo_id FROM grupo_membros WHERE usuario_id = $1`,
            [userId]
          );
          for (const row of groups.rows) {
            socket.join(`group:${row.grupo_id}`);
          }
          socket.emit('joined_groups', { ok: true, groups: groups.rows.map((r: any) => r.grupo_id) });
        } catch (err) {
          socket.emit('joined_groups', { ok: false });
        }
      });

      socket.on('typing', (data: { destinatario_id?: number; grupo_id?: number; isTyping: boolean }) => {
        try {
          if (data?.destinatario_id) {
            this.io.to(`user:${data.destinatario_id}`).emit('user_typing', {
              userId,
              isTyping: !!data.isTyping
            });
          } else if (data?.grupo_id) {
            this.io.to(`group:${data.grupo_id}`).emit('user_typing', {
              userId,
              isTyping: !!data.isTyping
            });
          }
        } catch (err) {
          logger.error('Erro no evento typing', { err });
        }
      });

      socket.on('send_message', async (data: { destinatario_id?: number; grupo_id?: number; conteudo?: string; anexos?: string[] | null }) => {
        try {
          const autorId = Number(userId);
          const conteudo = (data?.conteudo || '').toString().trim();

          if (data?.grupo_id) {
            // Verificar participação
            const gid = Number(data.grupo_id);
            const isMember = await this.pool.query(
              `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2`,
              [gid, autorId]
            );
            if ((isMember.rowCount || 0) === 0) {
              socket.emit('message_error', { message: 'Você não pertence a este grupo' });
              return;
            }

            // Persistir mensagem de grupo
            const insert = await this.pool.query(
              `INSERT INTO mensagens_grupo (grupo_id, autor_id, conteudo)
               VALUES ($1,$2,$3) RETURNING *`,
              [gid, autorId, conteudo]
            );

            const row = insert.rows[0];
            const message = {
              id: row.id,
              remetente_id: row.autor_id,
              grupo_id: row.grupo_id,
              conteudo: row.conteudo,
              tipo: 'texto',
              data_criacao: row.data_publicacao,
              lida: false,
              anexos: data?.anexos || null
            };

            // Entregar para membros do grupo (exceto autor)
            const members = await this.pool.query(
              `SELECT usuario_id FROM grupo_membros WHERE grupo_id = $1`,
              [gid]
            );
            for (const m of members.rows) {
              const uid = Number(m.usuario_id);
              if (uid === autorId) continue;
              if (this.userSockets.has(String(uid))) {
                this.io.to(`user:${uid}`).emit('new_message', message);
              } else {
                const unreadKey = `chat:unread:${uid}`;
                await redis.lpush(unreadKey, JSON.stringify(message));
                await applyUnreadRetention(unreadKey);
              }
            }

            // Confirmar ao remetente
            socket.emit('message_sent', message);
            // Emitir na sala do grupo
            this.io.to(`group:${gid}`).emit('new_message', message);
            return;
          }

          const destinatarioId = Number(data?.destinatario_id);
          if (!destinatarioId || !conteudo) {
            socket.emit('message_error', { message: 'destinatario_id e conteudo são obrigatórios' });
            return;
          }

          // Persistir em mensagens_usuario
          const result = await this.pool.query(
            `INSERT INTO mensagens_usuario (autor_id, destinatario_id, conteudo)
             VALUES ($1,$2,$3) RETURNING *`,
            [autorId, destinatarioId, conteudo]
          );

          const row = result.rows[0];
          const message = {
            id: row.id,
            remetente_id: row.autor_id,
            destinatario_id: row.destinatario_id,
            conteudo: row.conteudo,
            tipo: 'texto',
            data_criacao: row.data_publicacao,
            lida: !!row.lida,
            anexos: data?.anexos || null
          };

          // Entregar ao destinatário ou enfileirar
          if (this.userSockets.has(String(destinatarioId))) {
            this.io.to(`user:${destinatarioId}`).emit('new_message', message);
          } else {
            const unreadKey = `chat:unread:${destinatarioId}`;
            await redis.lpush(unreadKey, JSON.stringify(message));
            await applyUnreadRetention(unreadKey);
          }
          // Confirmar ao remetente
          socket.emit('message_sent', message);
        } catch (error: any) {
          logger.error('Erro ao enviar mensagem', { error: error?.message });
          socket.emit('message_error', { message: 'Erro ao enviar mensagem' });
        }
      });

      socket.on('read_message', async (messageId: number) => {
        try {
          if (!messageId) return;
          await this.pool.query('UPDATE mensagens_usuario SET lida = true WHERE id = $1', [messageId]);
          // Notificar remetente e destinatário sobre leitura
          this.io.emit('message_read', { messageId, readBy: Number(userId) });
        } catch (error: any) {
          logger.error('Erro ao marcar mensagem como lida', { error: error?.message, messageId });
        }
      });
    });
  }

  private handleDatabaseNotification(data: any) {
    switch (data.type) {
      case 'new_post':
        this.io.emit('feed:new_post', data.post);
        
        // Enviar notificação para seguidores
        if (data.followers) {
          data.followers.forEach((followerId: string) => {
            this.sendNotification(followerId, {
              type: 'new_post',
              title: 'Nova publicação',
              message: `${data.post.autor.nome} fez uma nova publicação`,
              data: { postId: data.post.id }
            });
          });
        }
        break;

      case 'new_comment':
        this.io.to(`post:${data.post_id}`).emit('post:new_comment', {
          postId: data.post_id,
          comment: data.comment
        });
        // Broadcast de alto nível para apps que não ingressam em salas de post
        this.io.emit('feed:new_comment', {
          postId: data.post_id,
          comment: data.comment
        });
        
        // Notificar autor do post e outros comentaristas
        if (data.notifyUsers) {
          data.notifyUsers.forEach((userId: string) => {
            if (userId !== data.comment.autor_id) {
              this.sendNotification(userId, {
                type: 'new_comment',
                title: 'Novo comentário',
                message: `${data.comment.autor.nome} comentou em uma publicação`,
                data: { postId: data.post_id }
              });
            }
          });
        }
        break;

      case 'like_update':
        this.io.to(`post:${data.post_id}`).emit('post:like_update', {
          postId: data.post_id,
          likes: data.likes_count,
          userId: data.user_id,
          action: data.action
        });
        this.io.emit('feed:like_update', {
          postId: data.post_id,
          likes: data.likes_count,
          userId: data.user_id,
          action: data.action
        });

        // Notificar autor se for um novo like
        if (data.action === 'like' && data.autor_id !== data.user_id) {
          this.sendNotification(data.autor_id, {
            type: 'new_like',
            title: 'Nova curtida',
            message: `${data.userName} curtiu sua publicação`,
            data: { postId: data.post_id }
          });
        }
        break;

      case 'post_deleted':
        this.io.emit('feed:post_deleted', {
          postId: data.post_id
        });
        break;

      default:
        logger.warn('Tipo de notificação desconhecido:', data.type);
    }
  }

  private async sendUnreadNotifications(userId: string, socket: Socket) {
    try {
      const notifications = await redis.lrange(`unread:${userId}`, 0, -1);
      
      for (const notification of notifications) {
        socket.emit('notification', JSON.parse(notification));
      }
    } catch (error) {
      logger.error('Erro ao enviar notificações não lidas', {
        userId,
        error: (error as any).message
      });
    }
  }

  private async sendUnreadChatMessages(userId: string, socket: Socket) {
    try {
      const key = `chat:unread:${userId}`;
      const messages = await redis.lrange(key, 0, -1);
      const privateIds: number[] = [];
      for (const raw of messages) {
        try {
          const msg = JSON.parse(raw);
          socket.emit('new_message', msg);
          if (msg && msg.id && msg.destinatario_id && String(msg.destinatario_id) === String(userId)) {
            privateIds.push(Number(msg.id));
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      // Marcar como lidas em lote (somente privadas)
      if (privateIds.length > 0) {
        try {
          await this.pool.query(
            `UPDATE mensagens_usuario SET lida = TRUE WHERE id = ANY($1::int[]) AND destinatario_id = $2`,
            [privateIds, Number(userId)]
          );
        } catch (e) {
          logger.error('Erro ao marcar mensagens privadas como lidas (offline)', { userId, count: privateIds.length });
        }
      }

      // Limpar fila após entrega
      if (messages.length > 0) {
        await redis.del(key);
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagens de chat não lidas', {
        userId,
        error: (error as any).message
      });
    }
  }

  private async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      await redis.lrem(`unread:${userId}`, 0, notificationId);
      
      await redis.multi()
        .hset(`notification:${notificationId}`, 'read', '1')
        .hset(`notification:${notificationId}`, 'readAt', new Date().toISOString())
        .exec();

    } catch (error) {
      logger.error('Erro ao marcar notificação como lida', {
        userId,
        notificationId,
        error: (error as any).message
      });
    }
  }

  private handleTypingStart(socket: Socket & { data: SocketData }, postId: string) {
    const userId = socket.data.user.id;
    const postTyping = this.typingUsers.get(postId) || new Set();
    
    if (!postTyping.has(userId)) {
      postTyping.add(userId);
      this.typingUsers.set(postId, postTyping);

      socket.to(`post:${postId}`).emit('typing:update', {
        postId,
        user: socket.data.user,
        status: 'typing'
      });

      // Limpar status após timeout
      const timeoutKey = `${postId}:${userId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
      }

      this.typingTimeouts.set(
        timeoutKey,
        setTimeout(() => this.handleTypingStop(socket, postId), 3000)
      );
    }
  }

  private handleTypingStop(socket: Socket & { data: SocketData }, postId: string) {
    const userId = socket.data.user.id;
    this.clearTyping(userId, postId);

    socket.to(`post:${postId}`).emit('typing:update', {
      postId,
      user: socket.data.user,
      status: 'stopped'
    });
  }

  private clearTyping(userId: string, postId?: string) {
    if (postId) {
      const postTyping = this.typingUsers.get(postId);
      if (postTyping) {
        postTyping.delete(userId);
        if (postTyping.size === 0) {
          this.typingUsers.delete(postId);
        }
      }
      
      const timeoutKey = `${postId}:${userId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
        this.typingTimeouts.delete(timeoutKey);
      }
    } else {
      // Limpar de todos os posts
      this.typingUsers.forEach((users, postId) => {
        if (users.has(userId)) {
          this.clearTyping(userId, postId);
        }
      });
    }
  }

  // Métodos públicos
  public async sendNotification(userId: string, notification: any) {
    const userSockets = this.userSockets.get(userId);
    
    if (userSockets && userSockets.length > 0) {
      this.io.to(`user:${userId}`).emit('notification', notification);
    } else {
      // Armazenar para envio posterior
      const unreadKey = `unread:${userId}`;
      await redis.lpush(unreadKey, JSON.stringify(notification));
      await applyUnreadRetention(unreadKey);
    }
  }

  public notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public notifyPost(postId: string, event: string, data: any) {
    this.io.to(`post:${postId}`).emit(event, data);
  }

  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  public stop() {
    this.io.close();
  }
}
