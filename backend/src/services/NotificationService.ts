import { redis } from '../lib/redis';
import { db } from '../database';
import { logger } from './logger';

export interface NotificationMessage {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo?: string;
  actionUrl?: string;
  action_url?: string;
  data_envio?: string;
  created_at?: string;
  payload?: Record<string, unknown> | null;
}

export class NotificationService {
  constructor(private readonly cache = redis) {}

  async send(notification: NotificationMessage): Promise<void> {
    const queueKey = `notifications:user:${notification.user_id}`;
    const preparedMessage = {
      id: notification.id,
      title: notification.titulo,
      message: notification.mensagem,
      type: notification.tipo ?? 'info',
      actionUrl: notification.actionUrl ?? notification.action_url ?? null,
      dataEnvio: notification.data_envio ?? new Date().toISOString(),
      payload: notification.payload ?? null
    };

    await this.cache.lpush(queueKey, JSON.stringify(preparedMessage));

    try {
      await db.none(
        `UPDATE notifications
         SET enviado_app = TRUE,
             data_envio = COALESCE(data_envio, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [notification.id]
      );
    } catch (error: any) {
      logger.debug('Falha ao atualizar status da notificação no banco', {
        notificationId: notification.id,
        error: error?.message || error
      });
    }

    logger.info('Notificação enviada via canal in-app', {
      notificationId: notification.id,
      userId: notification.user_id
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await db.none(
        `UPDATE notifications
         SET lida = TRUE,
             data_leitura = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );
    } catch (error: any) {
      logger.error('Erro ao marcar notificação como lida', {
        notificationId,
        userId,
        error: error?.message || error
      });
      throw error;
    }
  }
}
