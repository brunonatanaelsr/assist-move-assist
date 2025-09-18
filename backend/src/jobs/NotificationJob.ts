import { Job } from '../types/Job';
import { NotificationService } from '../services/NotificationService';
import { EmailService } from '../services/EmailService';
import { WhatsAppService } from '../services/WhatsAppService';
import { logger } from '../services/logger';
import { db } from '../database';

interface NotificationRecord {
  id: string;
  user_id: string;
  canal: string[];
  [key: string]: any;
}

interface NotificationPayload {
  notificationId: string;
}

export class NotificationJob implements Job {
  constructor(
    private notificationService: NotificationService,
    private emailService: EmailService,
    private whatsAppService: WhatsAppService
  ) {}

  async execute(payload: NotificationPayload): Promise<void> {
    const { notificationId } = payload;

    try {
      // Buscar notificação
      const notification = await db.one<NotificationRecord>(
        'SELECT * FROM notifications WHERE id = $1',
        [notificationId]
      );

      // Enviar por cada canal configurado
      for (const canal of notification.canal) {
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
          logger.error('Erro ao enviar notificação', {
            notificationId,
            canal,
            error: error.message
          });

          // Registrar erro
          await db.none(
            `UPDATE notifications 
            SET tentativas_envio = tentativas_envio + 1,
                erro_envio = $1
            WHERE id = $2`,
            [error.message, notification.id]
          );
        }
      }

    } catch (error) {
      logger.error('Erro ao processar job de notificação', {
        notificationId,
        error: error.message
      });
      throw error;
    }
  }
}
