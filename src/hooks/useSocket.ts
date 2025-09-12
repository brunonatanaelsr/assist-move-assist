import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

interface Message {
  id: number;
  remetente_id: number;
  destinatario_id?: number;
  grupo_id?: number;
  conteudo: string;
  tipo: string;
  data_criacao: string;
  lida: boolean;
  anexos?: string[];
  remetente_nome?: string;
  arquivo_nome?: string;
  arquivo_url?: string;
  arquivo_tipo?: string;
  arquivo_tamanho?: number;
}

interface UserStatus {
  user_id: string;
  nome: string;
  online: boolean;
}

export const useSocket = () => {
  const { isAuthenticated, profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([]);
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile) {
      return;
    }

    // Obter token do localStorage
    // O app salva o JWT com a chave 'token' (ver usePostgreSQLAuth.tsx)
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Token não encontrado');
      return;
    }

    // Conectar ao socket apenas se estiver autenticado
    const WS_URL = (import.meta as any)?.env?.VITE_WS_URL 
      || (import.meta.env.DEV ? 'http://localhost:3000' : 'http://127.0.0.1:3000');
    const socket = io(
      WS_URL,
      {
        auth: { token },
        transports: ['websocket', 'polling']
      }
    );

    socket.on('connect', () => {
      console.log('🔌 Socket.IO conectado!');
      setIsConnected(true);
      
      // Entrar nos grupos automaticamente
      socket.emit('join_groups');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO desconectado!');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão Socket.IO:', error);
      setIsConnected(false);
    });

    // Escutar status de usuários
    socket.on('user_status', (data: { userId: number, status: 'online' | 'offline' }) => {
      const userStatus: UserStatus = {
        user_id: data.userId.toString(),
        nome: '', // Preenchido quando necessário
        online: data.status === 'online'
      };
      
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.user_id !== data.userId.toString());
        return data.status === 'online' 
          ? [...filtered, userStatus]
          : filtered;
      });
    });

    // Escutar novas mensagens
    socket.on('new_message', (message: Message) => {
      console.log('📨 Nova mensagem recebida:', message);
      
      setNewMessages(prev => [message, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      // Notificação do browser se permitido
      if (Notification.permission === 'granted') {
        new Notification(`Nova mensagem de ${message.remetente_nome}`, {
          body: message.conteudo || 'Anexo enviado',
          icon: '/favicon.ico'
        });
      }
    });

    // Escutar confirmação de envio
    socket.on('message_sent', (message: Message) => {
      console.log('✅ Mensagem enviada confirmada:', message);
    });

    // Escutar erros de mensagem
    socket.on('message_error', (error: any) => {
      console.error('❌ Erro ao enviar mensagem:', error);
    });

    // Escutar digitação
    socket.on('user_typing', (data: { userId: number, isTyping: boolean }) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));
      
      // Limpar após 3 segundos se não receber outro evento
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: false
          }));
        }, 3000);
      }
    });

    // Escutar confirmação de leitura
    socket.on('message_read', (data: { messageId: number, readBy: number }) => {
      console.log('✅ Mensagem lida:', data);
    });

    socketRef.current = socket;

    // Solicitar permissão de notificação
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, profile]);

  // Função para enviar mensagem via socket
  const sendMessage = (destinatarioId: string, conteudo: string, remetente_nome?: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket não conectado');
      return false;
    }

    const messageData = {
      destinatario_id: parseInt(destinatarioId),
      conteudo,
      anexos: null
    };

    socketRef.current.emit('send_message', messageData);
    return true;
  };

  // Função para enviar mensagem com arquivo via socket
  const sendFileMessage = (destinatarioId: string, fileInfo: any, remetente_nome?: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket não conectado');
      return false;
    }

    const messageData = {
      destinatario_id: parseInt(destinatarioId),
      conteudo: fileInfo.filename || 'Arquivo enviado',
      anexos: [fileInfo.url]
    };

    socketRef.current.emit('send_message', messageData);
    return true;
  };

  // Função para enviar mensagem para grupo
  const sendGroupMessage = (grupoId: string, conteudo: string, anexos?: string[]) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket não conectado');
      return false;
    }

    const messageData = {
      grupo_id: parseInt(grupoId),
      conteudo,
      anexos: anexos || null
    };

    socketRef.current.emit('send_message', messageData);
    return true;
  };

  // Função para marcar mensagem como lida
  const markAsRead = (messageId: string) => {
    if (!socketRef.current || !isConnected) {
      return false;
    }

    socketRef.current.emit('read_message', parseInt(messageId));
    return true;
  };

  // Função para notificar digitação
  const sendTyping = (destinatarioId: string, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('typing', {
      destinatario_id: parseInt(destinatarioId),
      isTyping
    });
  };

  // Função para notificar digitação em grupo
  const sendGroupTyping = (grupoId: string, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('typing', {
      grupo_id: parseInt(grupoId),
      isTyping
    });
  };

  // Função para adicionar listener personalizado
  const addMessageListener = (callback: (message: Message) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('new_message', callback);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message', callback);
      }
    };
  };

  // Função para verificar se usuário está online
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.user_id === userId && user.online);
  };

  // Função para obter usuários online
  const getOnlineUsers = () => {
    return onlineUsers.filter(user => user.online);
  };

  // Função para entrar em um grupo
  const joinGroup = (groupId: string) => {
    if (!socketRef.current || !isConnected) {
      return false;
    }

    // O backend já gerencia isso automaticamente quando conecta
    console.log('Joined group:', groupId);
    return true;
  };

  // Função para sair de um grupo
  const leaveGroup = (groupId: string) => {
    if (!socketRef.current || !isConnected) {
      return false;
    }

    console.log('Left group:', groupId);
    return true;
  };

  // Função para adicionar listener de status
  const addStatusListener = (callback: (users: UserStatus[]) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('user_status', () => {
      callback(onlineUsers);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('user_status');
      }
    };
  };

  // Função para limpar mensagens novas
  const clearNewMessages = () => {
    setNewMessages([]);
  };

  // Função para limpar contador não lidas
  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    newMessages,
    unreadCount,
    typingUsers,
    
    // Funções para enviar
    sendMessage,
    sendFileMessage,
    sendGroupMessage,
    markAsRead,
    sendTyping,
    sendGroupTyping,
    joinGroup,
    leaveGroup,
    
    // Funções para listeners
    addMessageListener,
    addStatusListener,
    
    // Funções utilitárias
    isUserOnline,
    getOnlineUsers,
    clearNewMessages,
    clearUnreadCount
  };
};
