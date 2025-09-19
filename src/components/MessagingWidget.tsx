import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Users, Plus } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; nome_completo: string }>>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Mock data for now
      setConversations([]);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Mock data for now
      setMessages([]);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // Mock data for now
      setUsers([]);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadUsers();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      // Mock implementation for now
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const createConversation = async (selectedUsers: string[], isGroup: boolean, groupName?: string) => {
    if (!user) return;

    try {
      // Mock implementation for now
      setShowNewChat(false);
      loadConversations();
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.tipo === 'grupo') {
      return conversation.nome_grupo || 'Grupo sem nome';
    }
    
    const otherParticipant = conversation.participants.find(p => p.user_id !== String(user?.id));
    return otherParticipant?.nome_completo || 'Usuário';
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'UN';
    
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong"
        size="sm"
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
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <NewChatForm users={users} onCreateConversation={createConversation} />
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex">
        {!selectedConversation ? (
          <div className="w-full">
            <ScrollArea className="h-full">
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
                          {conversation.last_message.conteudo}
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
                >
                  ←
                </Button>
                <h3 className="font-medium">
                  {getConversationName(conversations.find(c => c.id === selectedConversation)!)}
                </h3>
              </div>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
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
                />
                <Button onClick={sendMessage} size="sm">
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
  onCreateConversation 
}: { 
  users: Array<{ id: string; nome_completo: string }>;
  onCreateConversation: (selectedUsers: string[], isGroup: boolean, groupName?: string) => void;
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;
    
    onCreateConversation(selectedUsers, isGroup, groupName);
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
          {users.map((user) => (
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