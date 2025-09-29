import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import useSocket from './useSocket';
import { useAuth } from './useAuth';

const messagingKeys = {
  conversations: ['messaging', 'conversations'] as const,
  users: ['messaging', 'users'] as const,
  messages: (conversationId: string | null) => ['messaging', 'messages', conversationId] as const,
};

type RawMessage = Record<string, any>;

type ConversationType = 'individual' | 'grupo';

export interface MessagingParticipant {
  user_id: string;
  nome_completo: string;
}

export interface MessagingConversation {
  id: string;
  tipo: ConversationType;
  nome_grupo?: string;
  participants: MessagingParticipant[];
  last_message?: {
    conteudo: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
}

export interface MessagingMessage {
  id: string;
  conteudo: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  editada: boolean;
}

export interface MessagingUserOption {
  id: string;
  nome_completo: string;
  raw?: Record<string, any>;
}

export interface UseMessagingOptions {
  enabled?: boolean;
}

const ensureError = (error: unknown): Error | null => {
  if (!error) return null;
  return error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido');
};

const normaliseId = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (Number.isNaN(value)) return null;
  const parsed = typeof value === 'string' ? value.trim() : String(value);
  return parsed.length > 0 ? parsed : null;
};

const normaliseName = (value: any, fallback = 'Usuário'): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

const getAuthorId = (message: RawMessage): string | null => {
  return (
    normaliseId(message.autor_id)
    ?? normaliseId(message.remetente_id)
    ?? normaliseId(message.autorId)
    ?? normaliseId(message.author_id)
    ?? normaliseId(message.sender_id)
  );
};

const getRecipientId = (message: RawMessage): string | null => {
  return (
    normaliseId(message.destinatario_id)
    ?? normaliseId(message.destinatarioId)
    ?? normaliseId(message.receiver_id)
    ?? normaliseId(message.recebedor_id)
  );
};

const getAuthorName = (message: RawMessage, fallback = 'Usuário'): string => {
  return normaliseName(
    message.autor_nome
      ?? message.remetente_nome
      ?? message.autorNome
      ?? message.sender_name
      ?? message.senderName,
    fallback
  );
};

const getRecipientName = (message: RawMessage, fallback = 'Usuário'): string => {
  return normaliseName(
    message.destinatario_nome
      ?? message.destinatarioNome
      ?? message.receiver_name
      ?? message.receiverName,
    fallback
  );
};

const getCreatedAt = (message: RawMessage): string => {
  return (
    message.data_publicacao
    ?? message.data_criacao
    ?? message.created_at
    ?? message.createdAt
    ?? new Date().toISOString()
  );
};

const toMessagingMessage = (
  message: RawMessage,
  currentUserId: string | null,
  currentUserName: string
): MessagingMessage => {
  const senderId = getAuthorId(message) ?? currentUserId ?? '0';
  const senderName = getAuthorName(
    message,
    currentUserId && senderId === currentUserId ? currentUserName : 'Usuário'
  );

  return {
    id: normaliseId(message.id) ?? `${Date.now()}`,
    conteudo: typeof message.conteudo === 'string' ? message.conteudo : '',
    sender_id: senderId,
    sender_name: senderName,
    created_at: getCreatedAt(message),
    editada: Boolean(message.editada ?? message.atualizada ?? message.updated_at),
  };
};

const mergeParticipants = (
  a: MessagingParticipant[],
  b: MessagingParticipant[],
): MessagingParticipant[] => {
  const map = new Map<string, MessagingParticipant>();
  [...a, ...b].forEach((participant) => {
    if (!participant?.user_id) return;
    const existing = map.get(participant.user_id);
    if (!existing || normaliseName(participant.nome_completo) !== 'Usuário') {
      map.set(participant.user_id, {
        user_id: participant.user_id,
        nome_completo: normaliseName(
          participant.nome_completo,
          existing?.nome_completo ?? 'Usuário'
        ),
      });
    }
  });
  return Array.from(map.values());
};

const buildConversationFromMessage = (
  message: RawMessage,
  currentUserId: string | null,
  currentUserName: string
): MessagingConversation | null => {
  const authorId = getAuthorId(message);
  const recipientId = getRecipientId(message);
  const baseParticipants: MessagingParticipant[] = [];

  if (authorId) {
    baseParticipants.push({
      user_id: authorId,
      nome_completo: getAuthorName(
        message,
        currentUserId && authorId === currentUserId ? currentUserName : 'Usuário'
      ),
    });
  }

  if (recipientId) {
    baseParticipants.push({
      user_id: recipientId,
      nome_completo: getRecipientName(
        message,
        currentUserId && recipientId === currentUserId ? currentUserName : 'Usuário'
      ),
    });
  }

  if (currentUserId && !baseParticipants.find((participant) => participant.user_id === currentUserId)) {
    baseParticipants.push({ user_id: currentUserId, nome_completo: currentUserName });
  }

  const participants = mergeParticipants(baseParticipants, []);

  if (participants.length === 0) {
    return null;
  }

  const senderId = getAuthorId(message);
  const conversationId = currentUserId
    ? (senderId && senderId !== currentUserId
        ? senderId
        : recipientId && recipientId !== currentUserId
          ? recipientId
          : senderId ?? recipientId ?? normaliseId(message.thread_id) ?? normaliseId(message.id)
      )
    : senderId ?? recipientId ?? normaliseId(message.thread_id) ?? normaliseId(message.id);

  if (!conversationId) {
    return null;
  }

  const lastMessage = toMessagingMessage(message, currentUserId, currentUserName);
  const isIncoming = currentUserId ? lastMessage.sender_id !== currentUserId : false;
  const recipientMatchesCurrent = currentUserId ? recipientId === currentUserId : false;
  const unreadCount = isIncoming && recipientMatchesCurrent && message.lida === false ? 1 : 0;

  return {
    id: conversationId,
    tipo: 'individual',
    participants,
    last_message: {
      conteudo: lastMessage.conteudo,
      created_at: lastMessage.created_at,
      sender_name: lastMessage.sender_name,
    },
    unread_count: unreadCount,
  };
};

export const useMessaging = ({ enabled = true }: UseMessagingOptions = {}) => {
  const { user } = useAuth();
  const { addMessageListener } = useSocket();
  const queryClient = useQueryClient();
  const currentUserId = user?.id !== undefined ? normaliseId(user.id) : null;
  const currentUserName = useMemo(
    () => normaliseName(user?.nome_completo ?? user?.nome ?? 'Você', 'Você'),
    [user?.nome, user?.nome_completo]
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const effectiveEnabled = enabled && Boolean(currentUserId);

  const usersQuery = useQuery({
    queryKey: messagingKeys.users,
    enabled: effectiveEnabled,
    queryFn: async () => {
      const response = await apiService.getUsuariosConversa();
      if (!response.success) {
        throw new Error(response.message ?? 'Erro ao carregar usuários');
      }
      const rawUsers = Array.isArray(response.data) ? response.data : [];
      return rawUsers.map((rawUser: any): MessagingUserOption => ({
        id: normaliseId(rawUser.id ?? rawUser.user_id ?? rawUser.usuario_id) ?? '',
        nome_completo: normaliseName(rawUser.nome_completo ?? rawUser.nome ?? rawUser.name),
        raw: rawUser,
      }));
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const conversationsQuery = useQuery({
    queryKey: messagingKeys.conversations,
    enabled: effectiveEnabled,
    queryFn: async () => {
      const response = await apiService.getConversasUsuario();
      if (!response.success) {
        throw new Error(response.message ?? 'Erro ao carregar conversas');
      }
      const rows = Array.isArray(response.data) ? response.data : [];
      const map = new Map<string, MessagingConversation>();

      rows.forEach((row) => {
        const conversation = buildConversationFromMessage(row, currentUserId, currentUserName);
        if (!conversation) {
          return;
        }

        const existing = map.get(conversation.id);
        if (!existing) {
          map.set(conversation.id, conversation);
          return;
        }

        const updatedParticipants = mergeParticipants(existing.participants, conversation.participants);
        const existingTime = Date.parse(existing.last_message?.created_at ?? '') || 0;
        const newTime = Date.parse(conversation.last_message?.created_at ?? '') || 0;

        if (newTime >= existingTime) {
          map.set(conversation.id, {
            ...conversation,
            participants: updatedParticipants,
            unread_count: Math.max(existing.unread_count, conversation.unread_count),
          });
        } else {
          map.set(conversation.id, {
            ...existing,
            participants: updatedParticipants,
            unread_count: Math.max(existing.unread_count, conversation.unread_count),
          });
        }
      });

      return Array.from(map.values()).sort((a, b) => {
        const aTime = Date.parse(a.last_message?.created_at ?? '') || 0;
        const bTime = Date.parse(b.last_message?.created_at ?? '') || 0;
        return bTime - aTime;
      });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const messagesQuery = useQuery({
    queryKey: messagingKeys.messages(selectedConversationId),
    enabled: effectiveEnabled && Boolean(selectedConversationId),
    queryFn: async () => {
      if (!selectedConversationId) {
        return [] as MessagingMessage[];
      }

      const destinatarioIdNumber = Number(selectedConversationId);
      if (!Number.isFinite(destinatarioIdNumber)) {
        throw new Error('Conversa inválida');
      }

      const response = await apiService.getMensagensUsuario(destinatarioIdNumber);
      if (!response.success) {
        throw new Error(response.message ?? 'Erro ao carregar mensagens');
      }
      const rows = Array.isArray(response.data) ? response.data : [];
      return rows
        .map((row) => toMessagingMessage(row, currentUserId, currentUserName))
        .sort((a, b) => {
          const aTime = Date.parse(a.created_at) || 0;
          const bTime = Date.parse(b.created_at) || 0;
          return aTime - bTime;
        });
    },
    refetchOnWindowFocus: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, conteudo }: { conversationId: string; conteudo: string }) => {
      const destinatarioIdNumber = Number(conversationId);
      if (!Number.isFinite(destinatarioIdNumber)) {
        throw new Error('Conversa inválida');
      }

      const response = await apiService.enviarMensagemUsuario({
        destinatario_id: destinatarioIdNumber,
        conteudo,
      });

      if (!response.success) {
        throw new Error(response.message ?? 'Erro ao enviar mensagem');
      }

      return response.data as RawMessage;
    },
    onSuccess: (message) => {
      if (!message) return;
      const conversationId = buildConversationFromMessage(message, currentUserId, currentUserName)?.id;
      if (!conversationId) return;

      const mappedMessage = toMessagingMessage(message, currentUserId, currentUserName);

      queryClient.setQueryData<MessagingMessage[] | undefined>(
        messagingKeys.messages(conversationId),
        (existing = []) => {
          if (existing.some((item) => item.id === mappedMessage.id)) {
            return existing;
          }
          return [...existing, mappedMessage].sort((a, b) => {
            const aTime = Date.parse(a.created_at) || 0;
            const bTime = Date.parse(b.created_at) || 0;
            return aTime - bTime;
          });
        }
      );

      queryClient.setQueryData<MessagingConversation[] | undefined>(
        messagingKeys.conversations,
        (existing = []) => {
          const conversationFromMessage = buildConversationFromMessage(message, currentUserId, currentUserName);
          if (!conversationFromMessage) {
            return existing;
          }

          const conversations = [...existing];
          const index = conversations.findIndex((conversation) => conversation.id === conversationId);
          if (index === -1) {
            conversations.unshift({
              ...conversationFromMessage,
              unread_count: 0,
            });
            return conversations;
          }

          const current = conversations[index];
          conversations[index] = {
            ...current,
            participants: mergeParticipants(current.participants, conversationFromMessage.participants),
            last_message: conversationFromMessage.last_message,
            unread_count: 0,
          };

          conversations.sort((a, b) => {
            const aTime = Date.parse(a.last_message?.created_at ?? '') || 0;
            const bTime = Date.parse(b.last_message?.created_at ?? '') || 0;
            return bTime - aTime;
          });

          return conversations;
        }
      );
    },
  });

  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    if (!conversationId) {
      return;
    }

    queryClient.setQueryData<MessagingConversation[] | undefined>(
      messagingKeys.conversations,
      (existing = []) => existing.map((conversation) => (
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      ))
    );
  }, [queryClient]);

  const createConversation = useCallback(
    async (selectedUsers: string[], isGroup: boolean, groupName?: string) => {
      if (isGroup) {
        console.warn('Conversa em grupo ainda não é suportada.');
        return;
      }

      const targetId = selectedUsers[0];
      if (!targetId) {
        return;
      }

      const normalizedTargetId = normaliseId(targetId);
      if (!normalizedTargetId) {
        return;
      }

      selectConversation(normalizedTargetId);

      queryClient.setQueryData<MessagingConversation[] | undefined>(
        messagingKeys.conversations,
        (existing = []) => {
          if (existing.some((conversation) => conversation.id === normalizedTargetId)) {
            return existing;
          }

          const targetUser = usersQuery.data?.find((userOption) => userOption.id === normalizedTargetId);
          const participants: MessagingParticipant[] = [];

          if (currentUserId) {
            participants.push({ user_id: currentUserId, nome_completo: currentUserName });
          }

          if (targetUser) {
            participants.push({ user_id: normalizedTargetId, nome_completo: targetUser.nome_completo });
          } else {
            participants.push({ user_id: normalizedTargetId, nome_completo: 'Usuário' });
          }

          return [
            {
              id: normalizedTargetId,
              tipo: 'individual',
              participants,
              unread_count: 0,
            },
            ...existing,
          ];
        }
      );
    },
    [currentUserId, currentUserName, queryClient, selectConversation, usersQuery.data]
  );

  const sendMessage = useCallback(
    async (conversationId: string, conteudo: string) => {
      if (!conteudo.trim()) {
        return;
      }
      await sendMessageMutation.mutateAsync({ conversationId, conteudo: conteudo.trim() });
    },
    [sendMessageMutation]
  );

  const updateCachesFromIncomingMessage = useCallback((message: RawMessage) => {
    const conversation = buildConversationFromMessage(message, currentUserId, currentUserName);
    if (!conversation) return;

    const mappedMessage = toMessagingMessage(message, currentUserId, currentUserName);
    const conversationId = conversation.id;
    const selectedId = selectedConversationIdRef.current;
    const isIncoming = currentUserId ? mappedMessage.sender_id !== currentUserId : true;

    queryClient.setQueryData<MessagingMessage[] | undefined>(
      messagingKeys.messages(conversationId),
      (existing = []) => {
        if (existing.some((item) => item.id === mappedMessage.id)) {
          return existing;
        }
        return [...existing, mappedMessage].sort((a, b) => {
          const aTime = Date.parse(a.created_at) || 0;
          const bTime = Date.parse(b.created_at) || 0;
          return aTime - bTime;
        });
      }
    );

    queryClient.setQueryData<MessagingConversation[] | undefined>(
      messagingKeys.conversations,
      (existing = []) => {
        const conversations = [...existing];
        const index = conversations.findIndex((item) => item.id === conversationId);
        if (index === -1) {
          conversations.unshift({
            ...conversation,
            unread_count: isIncoming && conversationId !== selectedId ? Math.max(conversation.unread_count, 1) : 0,
          });
          return conversations;
        }

        const current = conversations[index];
        const unreadCount = isIncoming && conversationId !== selectedId
          ? current.unread_count + 1
          : 0;

        conversations[index] = {
          ...current,
          participants: mergeParticipants(current.participants, conversation.participants),
          last_message: conversation.last_message,
          unread_count: unreadCount,
        };

        conversations.sort((a, b) => {
          const aTime = Date.parse(a.last_message?.created_at ?? '') || 0;
          const bTime = Date.parse(b.last_message?.created_at ?? '') || 0;
          return bTime - aTime;
        });

        return conversations;
      }
    );
  }, [currentUserId, currentUserName, queryClient]);

  useEffect(() => {
    if (!effectiveEnabled) {
      return undefined;
    }

    const removeListener = addMessageListener?.((message: RawMessage) => {
      updateCachesFromIncomingMessage(message);
    });

    return () => {
      removeListener?.();
    };
  }, [addMessageListener, effectiveEnabled, updateCachesFromIncomingMessage]);

  const usersLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    (usersQuery.data ?? []).forEach((userOption) => {
      lookup.set(userOption.id, userOption.nome_completo);
    });
    return lookup;
  }, [usersQuery.data]);

  const conversations = useMemo(() => {
    return (conversationsQuery.data ?? []).map((conversation) => ({
      ...conversation,
      participants: conversation.participants.map((participant) => ({
        ...participant,
        nome_completo: participant.nome_completo !== 'Usuário'
          ? participant.nome_completo
          : usersLookup.get(participant.user_id) ?? participant.nome_completo,
      })),
    }));
  }, [conversationsQuery.data, usersLookup]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  return {
    conversations,
    users: usersQuery.data ?? [],
    messages: messagesQuery.data ?? [],
    selectedConversation,
    selectedConversationId,
    selectConversation,
    createConversation,
    sendMessage,
    isSendingMessage: sendMessageMutation.isPending,
    isLoadingConversations: conversationsQuery.isPending,
    conversationsError: ensureError(conversationsQuery.error),
    isLoadingUsers: usersQuery.isPending,
    usersError: ensureError(usersQuery.error),
    isLoadingMessages: messagesQuery.isPending,
    messagesError: ensureError(messagesQuery.error),
    refetchConversations: conversationsQuery.refetch,
  };
};

export default useMessaging;
