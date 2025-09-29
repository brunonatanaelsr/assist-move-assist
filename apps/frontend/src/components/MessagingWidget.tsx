import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { formatFromNow } from '@/lib/dayjs';
import { apiService } from '@/services/apiService';
import useSocket from '@/hooks/useSocket';

interface Conversation {
  id: string;
  tipo: 'individual' | 'grupo';
  nome_grupo?: string;
  participants: Array<{ user_id: string; nome_completo: string }>;
  last_message?: {
    conteudo: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
}

interface Message {
  id: string;
  conteudo: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  editada: boolean;
}

const MessagingWidget = () => {
  const { user, profile } = useAuth();
  const {
    sendMessage: sendSocketMessage,
    sendGroupMessage,
    isConnected,
    addMessageListener,
  } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; nome_completo: string }>>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [createConversationLoading, setCreateConversationLoading] = useState(false);
  const [createConversationError, setCreateConversationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const usersDirectoryRef = useRef<Map<string, string>>(new Map());
  const profileNameRef = useRef<string | undefined>(profile?.nome || undefined);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    profileNameRef.current = profile?.nome || undefined;
  }, [profile?.nome]);

  const normaliseUserName = useCallback((nome?: string | null, email?: string | null) => {
    if (nome && nome.trim().length > 0) {
      return nome.trim();
    }
    if (email && email.trim().length > 0) {
      return email.trim();
    }
    return 'Usuário';
  }, []);

  const updateUsersDirectory = useCallback(
    (entries: Array<{ id: string; nome_completo: string }>) => {
      const directory = new Map<string, string>();
      entries.forEach((entry) => {
        directory.set(entry.id, entry.nome_completo);
      });

      if (user?.id) {
        directory.set(
          String(user.id),
          profileNameRef.current ?? normaliseUserName((user as any)?.nome, (user as any)?.email)
        );
      }

      usersDirectoryRef.current = directory;
    },
    [normaliseUserName, user]
  );

  const loadUsers = useCallback(async () => {
    if (!user) {
      setUsers([]);
      updateUsersDirectory([]);
      return [] as Array<{ id: string; nome_completo: string }>;
    }

    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await apiService.getUsuariosConversa();
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar usuários');
      }

      const fetchedUsers = (response.data || [])
        .filter((item: any) => Number(item.id) !== Number(user.id))
        .map((item: any) => ({
          id: String(item.id),
          nome_completo: normaliseUserName(item.nome ?? item.nome_completo, item.email),
        }));

      setUsers(fetchedUsers);
      updateUsersDirectory(fetchedUsers);
      return fetchedUsers;
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setUsers([]);
      setUsersError('Não foi possível carregar a lista de usuários.');
      updateUsersDirectory([]);
      return [] as Array<{ id: string; nome_completo: string }>;
    } finally {
      setUsersLoading(false);
    }
  }, [normaliseUserName, updateUsersDirectory, user]);

  const mapMessageToState = useCallback(
    (rawMessage: any): Message => {
      const senderId = rawMessage.autor_id ?? rawMessage.remetente_id ?? rawMessage.sender_id;
      const createdAt =
        rawMessage.data_publicacao ||
        rawMessage.data_criacao ||
        rawMessage.created_at ||
        new Date().toISOString();
      const senderIdString = senderId !== undefined && senderId !== null ? String(senderId) : '0';
      const senderName =
        usersDirectoryRef.current.get(senderIdString) ||
        rawMessage.autor_nome ||
        rawMessage.remetente_nome ||
        (senderIdString === String(user?.id) ? 'Você' : 'Usuário');

      return {
        id: String(rawMessage.id ?? `${senderIdString}-${createdAt}`),
        conteudo: rawMessage.conteudo || '',
        sender_id: senderIdString,
        sender_name: senderName,
        created_at: createdAt,
        editada: Boolean(rawMessage.editada),
      };
    },
    [user?.id]
  );

  const loadConversations = useCallback(
    async (knownUsers?: Array<{ id: string; nome_completo: string }>) => {
      if (!user) return;

      setConversationsLoading(true);
      setConversationsError(null);

      try {
        const [directResponse, groupsResponse] = await Promise.all([
          apiService.getConversasUsuario(),
          apiService
            .get<any[]>('/grupos')
            .catch(() => ({ success: false, data: [] as any[] } as const)),
        ]);

        if (!directResponse.success) {
          throw new Error(directResponse.message || 'Erro ao carregar conversas diretas');
        }

        const availableUsers = knownUsers ?? users;
        if (availableUsers.length > 0) {
          updateUsersDirectory(availableUsers);
        }

        const directory = usersDirectoryRef.current;
        const conversationsMap = new Map<string, Conversation>();

        (directResponse.data || []).forEach((entry: any) => {
          const authorId = entry.autor_id ?? entry.remetente_id;
          const recipientId = entry.destinatario_id ?? entry.receiver_id;
          if (!authorId || !recipientId) return;

          const partnerId = Number(authorId) === Number(user.id) ? recipientId : authorId;
          const conversationId = `direct-${partnerId}`;
          const createdAt = entry.data_publicacao || entry.data_criacao || entry.created_at || new Date().toISOString();
          const senderIdString = String(authorId);
          const partnerIdString = String(partnerId);

          const lastMessage = {
            conteudo: entry.conteudo || '',
            created_at: createdAt,
            sender_name:
              directory.get(senderIdString) ||
              entry.autor_nome ||
              (senderIdString === String(user.id) ? 'Você' : 'Usuário'),
          };

          const existing = conversationsMap.get(conversationId);

          if (!existing) {
            conversationsMap.set(conversationId, {
              id: conversationId,
              tipo: 'individual',
              participants: [
                {
                  user_id: String(user.id),
                  nome_completo: directory.get(String(user.id)) || profile?.nome || 'Você',
                },
                {
                  user_id: partnerIdString,
                  nome_completo:
                    directory.get(partnerIdString) ||
                    entry.destinatario_nome ||
                    entry.autor_nome ||
                    'Usuário',
                },
              ],
              last_message: lastMessage,
              unread_count: 0,
            });
            return;
          }

          const existingDate = existing.last_message?.created_at
            ? new Date(existing.last_message.created_at).getTime()
            : 0;
          const newDate = new Date(lastMessage.created_at).getTime();

          if (newDate >= existingDate) {
            conversationsMap.set(conversationId, {
              ...existing,
              last_message: lastMessage,
            });
          }
        });

        const directConversations = Array.from(conversationsMap.values()).sort((a, b) => {
          const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
          const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
          return bTime - aTime;
        });

        const groupConversations: Conversation[] = [];
        if (groupsResponse.success && Array.isArray(groupsResponse.data)) {
          groupsResponse.data.forEach((group: any) => {
            if (!group?.id) return;
            groupConversations.push({
              id: `group-${group.id}`,
              tipo: 'grupo',
              nome_grupo: group.nome || 'Grupo sem nome',
              participants: [],
              unread_count: 0,
            });
          });
        }

        setConversations([...groupConversations, ...directConversations]);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setConversations([]);
        setConversationsError('Não foi possível carregar as conversas.');
      } finally {
        setConversationsLoading(false);
      }
    },
    [profile?.nome, updateUsersDirectory, user]
  );

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setMessagesLoading(true);
      setMessagesError(null);

      try {
        if (!conversationId) {
          setMessages([]);
          return [] as Message[];
        }

        if (conversationId.startsWith('group-')) {
          const groupId = Number(conversationId.replace('group-', ''));
          const response = await apiService.get(`/grupos/${groupId}/mensagens`);
          if (!response.success) {
            throw new Error(response.message || 'Erro ao carregar mensagens do grupo');
          }
          const items = Array.isArray(response.data) ? [...response.data].reverse() : [];
          const mapped = items.map(mapMessageToState);
          setMessages(mapped);
          const last = mapped[mapped.length - 1];
          if (last) {
            setConversations((prev) =>
              prev.map((conversation) =>
                conversation.id === conversationId
                  ? {
                      ...conversation,
                      last_message: {
                        conteudo: last.conteudo,
                        created_at: last.created_at,
                        sender_name: last.sender_name,
                      },
                    }
                  : conversation
              )
            );
          }
          return mapped;
        }

        const userId = Number(conversationId.replace('direct-', ''));
        const response = await apiService.getMensagensUsuario(userId);
        if (!response.success) {
          throw new Error(response.message || 'Erro ao carregar mensagens');
        }
        const mapped = (response.data || []).map(mapMessageToState);
        setMessages(mapped);
        const last = mapped[mapped.length - 1];
        if (last) {
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    last_message: {
                      conteudo: last.conteudo,
                      created_at: last.created_at,
                      sender_name: last.sender_name,
                    },
                  }
                : conversation
            )
          );
        }
        return mapped;
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setMessages([]);
        setMessagesError('Não foi possível carregar as mensagens desta conversa.');
        return [] as Message[];
      } finally {
        setMessagesLoading(false);
      }
    },
    [mapMessageToState]
  );

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    let isMounted = true;

    (async () => {
      const fetchedUsers = await loadUsers();
      if (!isMounted) return;
      await loadConversations(fetchedUsers);
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user, loadConversations, loadUsers]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    const unsubscribe = addMessageListener((incoming) => {
      const isGroupMessage = incoming.grupo_id !== undefined && incoming.grupo_id !== null;
      const conversationId = isGroupMessage
        ? `group-${incoming.grupo_id}`
        : Number(incoming.remetente_id) === Number(user?.id)
          ? `direct-${incoming.destinatario_id}`
          : `direct-${incoming.remetente_id}`;

      const mapped = mapMessageToState(incoming);
      setConversations((prev) => {
        const existing = prev.find((conversation) => conversation.id === conversationId);
        if (!existing) {
          return [
            {
              id: conversationId,
              tipo: isGroupMessage ? 'grupo' : 'individual',
              nome_grupo: isGroupMessage ? incoming.grupo_nome || 'Grupo sem nome' : undefined,
              participants: isGroupMessage
                ? []
                : [
                    {
                      user_id: String(user?.id ?? ''),
                      nome_completo:
                        usersDirectoryRef.current.get(String(user?.id ?? '')) ||
                        profile?.nome ||
                        'Você',
                    },
                    {
                      user_id:
                        Number(incoming.remetente_id) === Number(user?.id)
                          ? String(incoming.destinatario_id)
                          : String(incoming.remetente_id),
                      nome_completo:
                        usersDirectoryRef.current.get(
                          Number(incoming.remetente_id) === Number(user?.id)
                            ? String(incoming.destinatario_id)
                            : String(incoming.remetente_id)
                        ) || 'Usuário',
                    },
                  ],
              last_message: {
                conteudo: mapped.conteudo,
                created_at: mapped.created_at,
                sender_name: mapped.sender_name,
              },
              unread_count: 0,
            },
            ...prev,
          ];
        }

        return prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message: {
                  conteudo: mapped.conteudo,
                  created_at: mapped.created_at,
                  sender_name: mapped.sender_name,
                },
              }
            : conversation
        );
      });

      if (selectedConversation === conversationId) {
        setMessages((prev) => [...prev, mapped]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addMessageListener, mapMessageToState, profile?.nome, selectedConversation, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      setSendLoading(true);
      setSendError(null);

      const messageContent = newMessage.trim();
      const conversation = conversations.find((item) => item.id === selectedConversation);
      if (!conversation) {
        throw new Error('Conversa não encontrada');
      }

      let newStateMessage: Message | null = null;

      if (conversation.tipo === 'grupo' && selectedConversation.startsWith('group-')) {
        const groupId = selectedConversation.replace('group-', '');
        if (!isConnected || !sendGroupMessage(groupId, messageContent)) {
          throw new Error('Não foi possível enviar a mensagem para o grupo');
        }

        newStateMessage = {
          id: `temp-${Date.now()}`,
          conteudo: messageContent,
          sender_id: String(user.id),
          sender_name: profile?.nome || 'Você',
          created_at: new Date().toISOString(),
          editada: false,
        };
      } else {
        const targetId = conversation.participants.find(
          (participant) => participant.user_id !== String(user.id)
        )?.user_id;
        if (!targetId) {
          throw new Error('Destinatário inválido');
        }

        if (isConnected) {
          sendSocketMessage(targetId, messageContent, profile?.nome || 'Você');
        }

        const response = await apiService.enviarMensagemUsuario({
          destinatario_id: Number(targetId),
          conteudo: messageContent,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Erro ao enviar mensagem');
        }

        newStateMessage = mapMessageToState(response.data);
      }

      if (newStateMessage) {
        setMessages((prev) => [...prev, newStateMessage!]);
        setConversations((prev) =>
          prev.map((conversationItem) =>
            conversationItem.id === selectedConversation
              ? {
                  ...conversationItem,
                  last_message: {
                    conteudo: newStateMessage!.conteudo,
                    created_at: newStateMessage!.created_at,
                    sender_name: newStateMessage!.sender_name,
                  },
                }
              : conversationItem
          )
        );
      }

      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setSendError('Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSendLoading(false);
    }
  }, [conversations, isConnected, mapMessageToState, newMessage, profile?.nome, selectedConversation, sendGroupMessage, sendSocketMessage, user]);

  const createConversation = useCallback(
    async (selectedUsers: string[], isGroup: boolean, groupName?: string) => {
      if (!user) return;

      try {
        setCreateConversationLoading(true);
        setCreateConversationError(null);

        if (isGroup) {
          const trimmedName = (groupName || '').trim();
          if (!trimmedName) {
            throw new Error('Nome do grupo é obrigatório');
          }

          const response = await apiService.post('/grupos', { nome: trimmedName });
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Erro ao criar grupo');
          }

          const groupId = response.data.id;
          await Promise.all(
            selectedUsers.map((memberId) =>
              apiService.post(`/grupos/${groupId}/membros`, {
                usuario_id: Number(memberId),
                papel: 'membro',
              })
            )
          );

          setConversations((prev) => [
            {
              id: `group-${groupId}`,
              tipo: 'grupo',
              nome_grupo: trimmedName,
              participants: selectedUsers.map((memberId) => ({
                user_id: memberId,
                nome_completo: usersDirectoryRef.current.get(memberId) ||
                  users.find((u) => u.id === memberId)?.nome_completo ||
                  'Usuário',
              })),
              unread_count: 0,
            },
            ...prev.filter((conversation) => conversation.id !== `group-${groupId}`),
          ]);

          setSelectedConversation(`group-${groupId}`);
          setMessages([]);
          await loadConversations();
        } else {
          if (selectedUsers.length !== 1) {
            throw new Error('Selecione apenas um usuário ou marque a opção de grupo.');
          }

          const targetId = selectedUsers[0];
          const mappedMessages = await loadMessages(`direct-${targetId}`);

          setConversations((prev) => {
            if (prev.some((conversation) => conversation.id === `direct-${targetId}`)) {
              return prev;
            }
            const targetUserName =
              usersDirectoryRef.current.get(targetId) ||
              users.find((u) => u.id === targetId)?.nome_completo ||
              'Usuário';
            return [
              {
                id: `direct-${targetId}`,
                tipo: 'individual',
                participants: [
                  {
                    user_id: String(user.id),
                    nome_completo: profile?.nome || 'Você',
                  },
                  {
                    user_id: targetId,
                    nome_completo: targetUserName,
                  },
                ],
                last_message: mappedMessages.length
                  ? {
                      conteudo: mappedMessages[mappedMessages.length - 1].conteudo,
                      created_at: mappedMessages[mappedMessages.length - 1].created_at,
                      sender_name: mappedMessages[mappedMessages.length - 1].sender_name,
                    }
                  : undefined,
                unread_count: 0,
              },
              ...prev,
            ];
          });

          setSelectedConversation(`direct-${targetId}`);
        }

        setShowNewChat(false);
      } catch (error) {
        console.error('Erro ao criar conversa:', error);
        setCreateConversationError((error as Error).message || 'Não foi possível criar a conversa.');
        throw error;
      } finally {
        setCreateConversationLoading(false);
      }
    },
    [loadConversations, loadMessages, profile?.nome, user, users]
  );

  const getConversationName = useCallback(
    (conversation: Conversation) => {
      if (conversation.tipo === 'grupo') {
        return conversation.nome_grupo || 'Grupo sem nome';
      }

      const otherParticipant = conversation.participants.find((p) => p.user_id !== String(user?.id));
      if (otherParticipant?.nome_completo) {
        return otherParticipant.nome_completo;
      }

      if (otherParticipant) {
        const userName =
          usersDirectoryRef.current.get(otherParticipant.user_id) ||
          users.find((u) => u.id === otherParticipant.user_id)?.nome_completo;
        if (userName) {
          return userName;
        }
      }

      return 'Usuário';
    },
    [user?.id, users]
  );

  const getInitials = useCallback((name?: string | null) => {
    if (!name) return 'UN';

    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong"
        size="sm"
        aria-label="Abrir mensagens"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card
      className="fixed bottom-6 right-6 w-96 h-[500px] shadow-strong flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mensagens-widget"
    >
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle id="mensagens-widget" className="text-lg">Mensagens</CardTitle>
          <div className="flex items-center space-x-2">
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Iniciar nova conversa">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <NewChatForm
                  users={users}
                  isLoading={createConversationLoading || usersLoading}
                  error={createConversationError || usersError}
                  onCreateConversation={createConversation}
                />
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label="Fechar mensagens">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex">
        {!selectedConversation ? (
          <div className="w-full">
            <ScrollArea className="h-full">
              {conversationsLoading && (
                <div className="p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
                  Carregando conversas...
                </div>
              )}
              {conversationsError && !conversationsLoading && (
                <div className="p-4 text-sm text-destructive" role="alert" aria-live="assertive">
                  {conversationsError}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => loadConversations()}>
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}
              {!conversationsLoading && !conversationsError && conversations.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
                  Nenhuma conversa disponível ainda.
                </div>
              )}
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {conversation.tipo === 'grupo' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          getInitials(getConversationName(conversation))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getConversationName(conversation)}
                      </p>
                      {conversation.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.last_message.sender_name}: {conversation.last_message.conteudo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  aria-label="Voltar para a lista de conversas"
                >
                  ←
                </Button>
                <h3 className="font-medium">
                  {getConversationName(conversations.find((c) => c.id === selectedConversation)!)}
                </h3>
              </div>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messagesLoading && (
                  <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
                    Carregando mensagens...
                  </div>
                )}
                {messagesError && !messagesLoading && (
                  <div className="text-sm text-destructive" role="alert" aria-live="assertive">
                    {messagesError}
                  </div>
                )}
                {!messagesLoading && !messagesError && messages.length === 0 && (
                  <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
                    Nenhuma mensagem nesta conversa ainda.
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === String(user?.id) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender_id === String(user?.id)
                          ? 'bg-primary text-primary-foreground ml-4'
                          : 'bg-muted mr-4'
                      }`}
                    >
                      {message.sender_id !== String(user?.id) && (
                        <p className="text-xs font-medium mb-1">{message.sender_name}</p>
                      )}
                      <p className="text-sm">{message.conteudo}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatFromNow(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={sendLoading}
                  aria-label="Digite sua mensagem"
                />
                <Button onClick={sendMessage} size="sm" disabled={sendLoading} aria-label="Enviar mensagem">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {sendError && (
                <p className="mt-2 text-xs text-destructive" role="alert" aria-live="assertive">
                  {sendError}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const NewChatForm = ({
  users,
  onCreateConversation,
  isLoading,
  error,
}: {
  users: Array<{ id: string; nome_completo: string }>;
  onCreateConversation: (selectedUsers: string[], isGroup: boolean, groupName?: string) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(error ?? null);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    try {
      await onCreateConversation(selectedUsers, isGroup, groupName);
      setSelectedUsers([]);
      setIsGroup(false);
      setGroupName('');
      setFormError(null);
    } catch (err) {
      setFormError((err as Error).message || 'Não foi possível criar a conversa.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isGroup"
          checked={isGroup}
          onCheckedChange={(checked) => setIsGroup(!!checked)}
          disabled={isLoading}
        />
        <Label htmlFor="isGroup">Criar grupo</Label>
      </div>

      {isGroup && (
        <div>
          <Label htmlFor="groupName">Nome do grupo</Label>
          <Input
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Digite o nome do grupo"
            required={isGroup}
            disabled={isLoading}
          />
        </div>
      )}

      <div>
        <Label>Selecionar usuários</Label>
        <ScrollArea className="h-40 border rounded-md p-2 mt-2">
          {isLoading && (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Carregando usuários...
            </p>
          )}
          {!isLoading && users.length === 0 && (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Nenhum usuário disponível.
            </p>
          )}
          {users.map((user) => (
            <div key={user.id} className="flex items-center space-x-2 py-1">
              <Checkbox
                id={user.id}
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedUsers([...selectedUsers, user.id]);
                  } else {
                    setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                  }
                }}
                disabled={isLoading}
              />
              <Label htmlFor={user.id} className="text-sm">{user.nome_completo}</Label>
            </div>
          ))}
        </ScrollArea>
      </div>

      {formError && (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={selectedUsers.length === 0 || isLoading}>
        Criar Conversa
      </Button>
    </form>
  );
};

export default MessagingWidget;
