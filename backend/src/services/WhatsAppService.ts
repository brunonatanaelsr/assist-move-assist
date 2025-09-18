import { logger } from './logger';

interface WhatsAppRecipient {
  telefone?: string;
  telefone_whatsapp?: string;
}

interface WhatsAppNotification {
  id: string;
  mensagem: string;
  titulo?: string;
  user?: WhatsAppRecipient & Record<string, any>;
  payload?: Record<string, unknown> | null;
}

export class WhatsAppService {
  async sendNotification(notification: WhatsAppNotification): Promise<void> {
    const phone = notification.user?.telefone_whatsapp ?? notification.user?.telefone;

    if (!phone) {
      logger.warn('Notificação WhatsApp sem telefone de destino', {
        notificationId: notification.id
      });
      return;
    }

    logger.info('Notificação enviada via WhatsApp (mock)', {
      notificationId: notification.id,
      phone,
      titulo: notification.titulo ?? null
    });
  }
}
