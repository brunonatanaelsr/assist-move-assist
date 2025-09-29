import React, { useState, useEffect, useRef } from 'react';
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
import useMessaging from '@/hooks/useMessaging';
import type { MessagingConversation, MessagingUserOption } from '@/hooks/useMessaging';

const MessagingWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    users,
    messages,
    selectedConversation,
    selectedConversationId,
    selectConversation,
    createConversation,
    sendMessage,
    isSendingMessage,
    isLoadingConversations,
    conversationsError,
    isLoadingUsers,
    usersError,
    isLoadingMessages,
    messagesError,
  } = useMessaging({ enabled: isOpen });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'UN';

    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const resolveConversationName = (conversation: MessagingConversation | null) => {
    if (!conversation) return 'Conversa';
    if (conversation.tipo === 'grupo') {
      return conversation.nome_grupo || 'Grupo sem nome';
    }

    const otherParticipant = conversation.participants.find((participant) => participant.user_id !== String(user?.id));
    if (!otherParticipant) {
      return 'Conversa';
    }

    const fallbackUser = users.find((participant) => participant.id === otherParticipant.user_id);
    return fallbackUser?.nome_completo || otherParticipant.nome_completo || 'Usuário';
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    try {
      await sendMessage(selectedConversationId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleCreateConversation = async (selectedUsers: string[], isGroup: boolean, groupName?: string) => {
    try {
      await createConversation(selectedUsers, isGroup, groupName);
      setShowNewChat(false);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

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
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-strong flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Mensagens</CardTitle>
          <div className="flex items-center space-x-2">
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Nova conversa">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <NewChatForm
                  users={users}
                  onCreateConversation={handleCreateConversation}
                  isLoading={isLoadingUsers}
                  error={usersError?.message ?? null}
                />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                selectConversation(null);
              }}
              aria-label="Fechar mensagens"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex">
        {!selectedConversation ? (
          <div className="w-full">
            <ScrollArea className="h-full">
              {isLoadingConversations ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando conversas...</div>
              ) : conversationsError ? (
                <div className="p-4 text-sm text-destructive">{conversationsError.message}</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {conversation.tipo === 'grupo' ? (
                            <Users className="w-5 h-5" />
                          ) : (
                            getInitials(resolveConversationName(conversation))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {resolveConversationName(conversation)}
                        </p>
                        {conversation.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.last_message.conteudo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectConversation(null)}
                >
                  ←
                </Button>
                <h3 className="font-medium">
                  {resolveConversationName(selectedConversation)}
                </h3>
              </div>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {isLoadingMessages ? (
                  <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
                ) : messagesError ? (
                  <div className="text-sm text-destructive">{messagesError.message}</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>
                ) : (
                  messages.map((message) => (
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
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  disabled={isSendingMessage}
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
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
  error
}: {
  users: MessagingUserOption[];
  onCreateConversation: (selectedUsers: string[], isGroup: boolean, groupName?: string) => Promise<void> | void;
  isLoading: boolean;
  error: string | null;
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    await onCreateConversation(selectedUsers, isGroup, groupName);
    setSelectedUsers([]);
    setIsGroup(false);
    setGroupName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isGroup"
          checked={isGroup}
          onCheckedChange={(checked) => setIsGroup(checked as boolean)}
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
          />
        </div>
      )}

      <div>
        <Label>Selecionar usuários</Label>
        <ScrollArea className="h-40 border rounded-md p-2 mt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando usuários...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário disponível.</p>
          ) : users.map((user) => (
            <div key={user.id} className="flex items-center space-x-2 py-1">
              <Checkbox
                id={user.id}
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedUsers([...selectedUsers, user.id]);
                  } else {
                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                  }
                }}
              />
              <Label htmlFor={user.id} className="text-sm">{user.nome_completo}</Label>
            </div>
          ))}
        </ScrollArea>
      </div>

      <Button type="submit" disabled={selectedUsers.length === 0}>
        Criar Conversa
      </Button>
    </form>
  );
};

export default MessagingWidget;