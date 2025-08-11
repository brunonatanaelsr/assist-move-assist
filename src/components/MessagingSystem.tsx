import { useState, useEffect } from "react";
import { MessageCircle, Send, X, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/usePostgreSQLAuth";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  nome_grupo?: string;
  tipo: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conteudo: string;
  sender_id: string;
  created_at: string;
  tipo: string;
  sender_name?: string;
}

export default function MessagingSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.user_id && isOpen) {
      loadConversations();
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
      subscribeToMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversas_participantes')
        .select(`
          conversa_id,
          conversas (
            id,
            nome_grupo,
            tipo,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      const conversationList = data?.map(item => ({
        id: item.conversas.id,
        nome_grupo: item.conversas.nome_grupo,
        tipo: item.conversas.tipo,
        created_at: item.conversas.created_at,
        updated_at: item.conversas.updated_at,
        last_message: "",
        unread_count: 0
      })) || [];

      setConversations(conversationList);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select(`
          id,
          conteudo,
          sender_id,
          created_at,
          tipo
        `)
        .eq('conversa_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender names separately
      const messageList = [];
      for (const msg of data || []) {
        const { data: senderData } = await supabase
          .from('profiles')
          .select('nome_completo')
          .eq('user_id', msg.sender_id)
          .single();

        messageList.push({
          id: msg.id,
          conteudo: msg.conteudo,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          tipo: msg.tipo,
          sender_name: senderData?.nome_completo || 'Usuário'
        });
      }

      setMessages(messageList);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          conversa_id: activeConversation,
          sender_id: profile?.user_id,
          conteudo: newMessage.trim(),
          tipo: 'texto'
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const getConversationName = (conversation: Conversation) => {
    return conversation.nome_grupo || 
           (conversation.tipo === 'individual' ? 'Chat Individual' : 'Grupo');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-xl z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Mensagens
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="conversations" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="new">Nova</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="mt-0 h-[400px] flex flex-col">
            {!activeConversation ? (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {loading ? (
                    <div className="text-center text-sm text-muted-foreground">
                      Carregando conversas...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">
                      Nenhuma conversa encontrada
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setActiveConversation(conversation.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {conversation.tipo === 'grupo' ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                'U'
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {getConversationName(conversation)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conversation.last_message || 'Sem mensagens'}
                            </p>
                          </div>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveConversation(null)}
                    >
                      ←
                    </Button>
                    <span className="text-sm font-medium">
                      {getConversationName(
                        conversations.find(c => c.id === activeConversation)!
                      )}
                    </span>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.sender_id === profile?.user_id 
                            ? "justify-end" 
                            : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-2 text-sm",
                            message.sender_id === profile?.user_id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {message.sender_id !== profile?.user_id && (
                            <p className="text-xs font-medium mb-1">
                              {message.sender_name}
                            </p>
                          )}
                          <p>{message.conteudo}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="min-h-0 h-9 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button size="sm" onClick={sendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="new" className="mt-0 h-[400px] p-3">
            <div className="text-center text-sm text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2" />
              <p>Nova conversa em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}