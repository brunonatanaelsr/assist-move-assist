import nodemailer from 'nodemailer';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';
import { config } from '../config';
import { renderTemplate } from '../templates/email/render';
import { RateLimiter } from '../utils/rate-limiter';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private rateLimiter: RateLimiter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });

    this.rateLimiter = new RateLimiter({
      points: 100, // 100 emails
      duration: 3600, // por hora
      keyPrefix: 'email_ratelimit:'
    });

    // Verificar conexão
    this.transporter.verify().catch((error) => {
      logger.error('Erro na configuração do email', error);
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, template, context, attachments } = options;

    try {
      // Verificar rate limit
      const canSend = await this.rateLimiter.consume(to);
      if (!canSend) {
        throw new Error('Rate limit excedido para este destinatário');
      }

      // Verificar cache de template
      const cacheKey = `email_template:${template}`;
      let html = await redis.get(cacheKey);

      if (!html) {
        html = await renderTemplate(template, context);
        await redis.setex(cacheKey, 3600, html); // Cache por 1 hora
      }

      // Enviar email
      await this.transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
        to,
        subject,
        html,
        attachments
      });

      logger.info('Email enviado com sucesso', {
        to,
        subject,
        template
      });

    } catch (error) {
      logger.error('Erro ao enviar email', {
        to,
        subject,
        template,
        error: error.message
      });
      
      throw error;
    }
  }

  async sendNotification(notification: any): Promise<void> {
    try {
      await this.sendEmail({
        to: notification.user.email,
        subject: notification.titulo,
        template: 'notification',
        context: {
          titulo: notification.titulo,
          mensagem: notification.mensagem,
          tipo: notification.tipo,
          data: notification.data_envio,
          actionUrl: notification.actionUrl
        }
      });

    } catch (error) {
      logger.error('Erro ao enviar notificação por email', {
        notificationId: notification.id,
        error: error.message
      });
      
      throw error;
    }
  }

  async sendBulkNotifications(notifications: any[]): Promise<void> {
    const promises = notifications.map(async (notification) => {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        logger.error('Erro ao enviar notificação em lote', {
          notificationId: notification.id,
          error: error.message
        });
      }
    });

    await Promise.all(promises);
  }
}
