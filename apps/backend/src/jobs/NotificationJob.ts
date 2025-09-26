import { Job } from '../types/Job';
import { NotificationService } from '../services/NotificationService';
import { EmailService } from '../services/EmailService';
import { WhatsAppService } from '../services/WhatsAppService';
import { logger } from '../services/logger';
import { db } from '../database';

interface NotificationRecord {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  canal: string[] | string;
  user_id: string;
  actionurl?: string;
  action_url?: string;
  data_envio?: string;
  tentativas_envio?: number;
  erro_envio?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface NotificationJobPayload {
  notificationId: string;
}

export class NotificationJob implements Job<NotificationJobPayload> {
  private notificationService: NotificationService;
  private emailService: EmailService;
  private whatsAppService: WhatsAppService;

  constructor(
    notificationService?: NotificationService,
    emailService?: EmailService,
    whatsAppService?: WhatsAppService
  ) {
    this.notificationService = notificationService ?? new NotificationService();
    this.emailService = emailService ?? new EmailService();
    this.whatsAppService = whatsAppService ?? new WhatsAppService();
  }

  async execute(payload: NotificationJobPayload): Promise<void> {
    const { notificationId } = payload;

    if (!notificationId) {
      logger.warn('Payload de notificação inválido recebido', { payload });
      return;
    }

    try {
      // Buscar notificação
      const notification = await db.oneOrNone<NotificationRecord>(
        'SELECT * FROM notifications WHERE id = $1',
        [notificationId]
      );

      if (!notification) {
        logger.warn('Notificação não encontrada', { notificationId });
        return;
      }

      // Enviar por cada canal configurado
      const canais = Array.isArray(notification.canal)
        ? notification.canal
        : String(notification.canal || '')
            .split(',')
            .map((canal) => canal.trim())
            .filter(Boolean);

      for (const canal of canais) {
        try {
          switch (canal) {
            case 'app':
              await this.notificationService.send(notification);
              break;
            
            case 'email':
              await this.emailService.sendNotification(notification);
              break;
            
            case 'whatsapp':
              await this.whatsAppService.sendNotification(notification);
              break;
          }

          // Registrar métrica de envio
          await db.none(
            `INSERT INTO notification_metrics
            (notification_id, user_id, action, device_info)
            VALUES ($1, $2, $3, $4)`,
            [
              notification.id,
              notification.user_id,
              'sent',
              { canal }
            ]
          );

        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          logger.error('Erro ao enviar notificação', {
            notificationId,
            canal,
            error: message
          });

          // Registrar erro
          await db.none(
            `UPDATE notifications
            SET tentativas_envio = tentativas_envio + 1,
                erro_envio = $1
            WHERE id = $2`,
            [message, notification.id]
          );
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Erro ao processar job de notificação', {
        notificationId,
        error: message
      });
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
