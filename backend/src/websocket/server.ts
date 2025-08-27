import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';
import { redis } from '../lib/redis';

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

        const decoded = jwt.verify(token, config.jwtSecret) as User;
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

      logger.info(`Usuário ${userId} conectado via WebSocket`);

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
        error: error.message
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
        error: error.message
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
      await redis.lpush(`unread:${userId}`, JSON.stringify(notification));
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
