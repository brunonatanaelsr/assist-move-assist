import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { AuthService, JWTPayload } from '../middleware/auth';
import { loggerService } from '../services/logger';

export interface AuthenticatedWebSocket extends WebSocket {
  user?: JWTPayload;
  isAlive?: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private async handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<void> {
    try {
      // Extrair token da query string ou headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.split(' ')[1];

      if (!token) {
        ws.close(1008, 'Token de autenticação requerido');
        return;
      }

      // Verificar token
      const user = AuthService.verifyToken(token);
      ws.user = user;
      ws.isAlive = true;

      // Adicionar cliente ao mapa
      this.clients.set(user.id, ws);

      loggerService.info('WebSocket conectado', { userId: user.id, email: user.email });

      // Configurar handlers
      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(ws, data);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        loggerService.error('Erro no WebSocket:', { userId: user.id, error });
      });

      // Enviar mensagem de boas-vindas
      this.sendToClient(user.id, {
        type: 'connected',
        message: 'Conectado ao sistema em tempo real',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      loggerService.error('Erro na autenticação WebSocket:', error);
      ws.close(1008, 'Token inválido');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'subscribe_notifications':
          // Implementar lógica de subscrição para notificações
          this.handleNotificationSubscription(ws, message);
          break;

        case 'subscribe_feed':
          // Implementar lógica de subscrição para feed
          this.handleFeedSubscription(ws, message);
          break;

        default:
          loggerService.warn('Tipo de mensagem WebSocket desconhecido:', { 
            type: message.type, 
            userId: ws.user?.id 
          });
      }
    } catch (error) {
      loggerService.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  private handleNotificationSubscription(ws: AuthenticatedWebSocket, message: any): void {
    // Implementar lógica específica para notificações
    ws.send(JSON.stringify({
      type: 'notification_subscribed',
      message: 'Inscrito para receber notificações',
      timestamp: new Date().toISOString()
    }));
  }

  private handleFeedSubscription(ws: AuthenticatedWebSocket, message: any): void {
    // Implementar lógica específica para feed
    ws.send(JSON.stringify({
      type: 'feed_subscribed',
      message: 'Inscrito para receber atualizações do feed',
      timestamp: new Date().toISOString()
    }));
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.user) {
      this.clients.delete(ws.user.id);
      loggerService.info('WebSocket desconectado', { userId: ws.user.id });
    }
  }

  private setupHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          ws.terminate();
          if (ws.user) {
            this.clients.delete(ws.user.id);
          }
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Ping a cada 30 segundos

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Métodos públicos para enviar mensagens
  public sendToClient(userId: string, message: any): boolean {
    const client = this.clients.get(userId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    
    return false;
  }

  public broadcastToRole(role: string, message: any): void {
    this.clients.forEach((client, userId) => {
      if (client.user?.role === role && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
      }
    });
  }

  public broadcast(message: any): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
      }
    });
  }

  // Métodos específicos do domínio
  public notifyNewBeneficiaria(beneficiaria: any, createdBy: string): void {
    this.broadcastToRole('admin', {
      type: 'new_beneficiaria',
      data: {
        beneficiaria,
        createdBy
      },
      message: `Nova beneficiária cadastrada: ${beneficiaria.nome_completo}`
    });

    this.broadcastToRole('profissional', {
      type: 'new_beneficiaria',
      data: {
        beneficiaria,
        createdBy
      },
      message: `Nova beneficiária cadastrada: ${beneficiaria.nome_completo}`
    });
  }

  public notifyFeedUpdate(feedItem: any): void {
    this.broadcast({
      type: 'feed_update',
      data: feedItem,
      message: 'Nova atualização no feed'
    });
  }

  public notifyStatusChange(beneficiariaId: string, oldStatus: string, newStatus: string, updatedBy: string): void {
    this.broadcast({
      type: 'status_change',
      data: {
        beneficiariaId,
        oldStatus,
        newStatus,
        updatedBy
      },
      message: `Status da beneficiária alterado de ${oldStatus} para ${newStatus}`
    });
  }

  public notifyNewMessage(message: any): void {
    // Notificar apenas o destinatário
    this.sendToClient(message.recipient_id, {
      type: 'new_message',
      data: message,
      message: `Nova mensagem de ${message.sender_name}`
    });

    // Notificar remetente que a mensagem foi enviada
    this.sendToClient(message.sender_id, {
      type: 'message_sent',
      data: message,
      message: 'Mensagem enviada com sucesso'
    });
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId);
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (server: any): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service não foi inicializado');
  }
  return webSocketService;
};
