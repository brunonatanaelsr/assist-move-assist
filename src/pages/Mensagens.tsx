import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, 
  Send, 
  Users, 
  Plus, 
  Search,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Settings,
  Bell,
  BellOff
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/usePostgreSQLAuth";
import { useToast } from "@/components/ui/use-toast";

interface Conversation {
  id: string;
  nome_grupo?: string;
  tipo: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count: number;
  participants?: any[];
}

interface Message {
  id: string;
  conteudo: string;
  sender_id: string;
  created_at: string;
  tipo: string;
  sender_name?: string;
  editada?: boolean;
}

interface UserProfile {
  user_id: string;
  nome_completo: string;
  email: string;
  avatar_url?: string;
}

export default function Mensagens() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newConversationName, setNewConversationName] = useState("");
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { profile } = useAuth();
  const { toast } = useToast();
  const isDev = process.env.NODE_ENV === 'development';

  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: notificationsEnabled ? "Notificações desativadas" : "Notificações ativadas",
      description: notificationsEnabled 
        ? "Você não receberá mais notificações de mensagens" 
        : "Você receberá notificações de novas mensagens",
    });
  };

  useEffect(() => {
    if (profile?.user_id) {
      loadConversations();
      loadUsers();
    }
  }, [profile]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
      subscribeToMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Dados mock para desenvolvimento
      const mockConversations: Conversation[] = [
        {
          id: "conv-1",
          nome_grupo: "Equipe Coordenação",
          tipo: "grupo",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date().toISOString(),
          last_message: "Reunião marcada para amanhã às 14h",
          unread_count: 2,
          participants: [
            { nome: "Ana Silva", cargo: "Coordenadora" },
            { nome: "Maria Santos", cargo: "Assistente Social" }
          ]
        },
        {
          id: "conv-2",
          nome_grupo: "Projeto Culinária",
          tipo: "grupo",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          last_message: "Lista de ingredientes atualizada",
          unread_count: 0,
          participants: [
            { nome: "Joana Lima", cargo: "Instrutora" },
            { nome: "Carlos Silva", cargo: "Assistente" }
          ]
        },
        {
          id: "conv-3",
          tipo: "individual",
          created_at: new Date(Date.now() - 259200000).toISOString(),
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          last_message: "Obrigada pelo suporte!",
          unread_count: 1,
          participants: [
            { nome: "Lucia Santos", cargo: "Beneficiária" }
          ]
        }
      ];

      setConversations(mockConversations);
    } catch (error) {
      if (isDev) {
        console.error('Erro ao carregar conversas:', error);
      }
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Dados mock para desenvolvimento
      const mockMessages: { [key: string]: Message[] } = {
        "conv-1": [
          {
            id: "msg-1",
            conteudo: "Bom dia, equipe! Como estão os preparativos para a oficina de hoje?",
            sender_id: "user-1",
            sender_name: "Ana Silva",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            tipo: "texto"
          },
          {
            id: "msg-2",
            conteudo: "Tudo certo por aqui! As beneficiárias já confirmaram presença.",
            sender_id: "user-2",
            sender_name: "Maria Santos",
            created_at: new Date(Date.now() - 1800000).toISOString(),
            tipo: "texto"
          },
          {
            id: "msg-3",
            conteudo: "Reunião marcada para amanhã às 14h",
            sender_id: "user-1",
            sender_name: "Ana Silva",
            created_at: new Date(Date.now() - 300000).toISOString(),
            tipo: "texto"
          }
        ],
        "conv-2": [
          {
            id: "msg-4",
            conteudo: "Pessoal, precisamos revisar a lista de ingredientes para próxima aula",
            sender_id: "user-3",
            sender_name: "Joana Lima",
            created_at: new Date(Date.now() - 7200000).toISOString(),
            tipo: "texto"
          },
          {
            id: "msg-5",
            conteudo: "Lista de ingredientes atualizada",
            sender_id: "user-4",
            sender_name: "Carlos Silva",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            tipo: "texto"
          }
        ],
        "conv-3": [
          {
            id: "msg-6",
            conteudo: "Olá! Tenho uma dúvida sobre o preenchimento do formulário PAEDI",
            sender_id: "user-5",
            sender_name: "Lucia Santos",
            created_at: new Date(Date.now() - 14400000).toISOString(),
            tipo: "texto"
          },
          {
            id: "msg-7",
            conteudo: "Claro! Posso te ajudar. Qual parte específica está com dificuldade?",
            sender_id: profile?.user_id || "current-user",
            sender_name: profile?.nome_completo || "Você",
            created_at: new Date(Date.now() - 10800000).toISOString(),
            tipo: "texto"
          },
          {
            id: "msg-8",
            conteudo: "Obrigada pelo suporte!",
            sender_id: "user-5",
            sender_name: "Lucia Santos",
            created_at: new Date(Date.now() - 7200000).toISOString(),
            tipo: "texto"
          }
        ]
      };

      setMessages(mockMessages[conversationId] || []);
    } catch (error) {
      if (isDev) {
        console.error('Erro ao carregar mensagens:', error);
      }
    }
  };

  const loadUsers = async () => {
    // Dados mock de usuários para desenvolvimento
    const mockUsers: UserProfile[] = [
      { user_id: "user-1", nome_completo: "Ana Silva", email: "ana@example.com" },
      { user_id: "user-2", nome_completo: "Maria Santos", email: "maria@example.com" },
      { user_id: "user-3", nome_completo: "Joana Lima", email: "joana@example.com" },
      { user_id: "user-4", nome_completo: "Carlos Silva", email: "carlos@example.com" },
      { user_id: "user-5", nome_completo: "Lucia Santos", email: "lucia@example.com" }
    ];
    
    setUsers(mockUsers);
  };

  const subscribeToMessages = (conversationId: string) => {
    // Em produção, implementar subscription real do Supabase
    if (isDev) {
      console.log(`Subscribed to messages for conversation: ${conversationId}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conteudo: newMessage,
        sender_id: profile?.user_id || "current-user",
        sender_name: profile?.nome_completo || "Você",
        created_at: new Date().toISOString(),
        tipo: "texto"
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");

      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso."
      });
    } catch (error) {
      if (isDev) {
        console.error('Erro ao enviar mensagem:', error);
      }
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    }
  };

  const createNewConversation = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um usuário.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newConv: Conversation = {
        id: `conv-new-${Date.now()}`,
        nome_grupo: selectedUsers.length > 1 ? newConversationName : undefined,
        tipo: selectedUsers.length > 1 ? "grupo" : "individual",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message: "",
        unread_count: 0,
        participants: selectedUsers.map(userId => {
          const user = users.find(u => u.user_id === userId);
          return { nome: user?.nome_completo || "Usuário", cargo: "Participante" };
        })
      };

      setConversations(prev => [newConv, ...prev]);
      setShowNewConversationDialog(false);
      setSelectedUsers([]);
      setNewConversationName("");
      setActiveConversation(newConv.id);

      toast({
        title: "Conversa criada",
        description: "Nova conversa criada com sucesso."
      });
    } catch (error) {
      if (isDev) {
        console.error('Erro ao criar conversa:', error);
      }
      toast({
        title: "Erro",
        description: "Não foi possível criar a conversa.",
        variant: "destructive"
      });
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.nome_grupo) return conversation.nome_grupo;
    if (conversation.tipo === 'individual' && conversation.participants?.length) {
      return conversation.participants[0].nome;
    }
    return conversation.tipo === 'individual' ? 'Chat Individual' : 'Grupo';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] max-w-7xl mx-auto">
      {/* Lista de Conversas */}
      <Card className="w-1/3 mr-4 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Mensagens
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleNotifications}
                className="px-2"
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </Button>
              <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
                <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Selecionar usuários:</label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {users.map(user => (
                        <div key={user.user_id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={user.user_id}
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(prev => [...prev, user.user_id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.user_id));
                              }
                            }}
                          />
                          <label htmlFor={user.user_id} className="text-sm">
                            {user.nome_completo}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedUsers.length > 1 && (
                    <div>
                      <label className="text-sm font-medium">Nome do grupo:</label>
                      <Input
                        value={newConversationName}
                        onChange={(e) => setNewConversationName(e.target.value)}
                        placeholder="Digite o nome do grupo"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  <Button onClick={createNewConversation} className="w-full">
                    Criar Conversa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                      activeConversation === conversation.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setActiveConversation(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback>
                          {conversation.tipo === 'grupo' ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getConversationName(conversation).charAt(0).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">
                            {getConversationName(conversation)}
                          </h4>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.updated_at)}
                            </span>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.last_message || 'Sem mensagens'}
                        </p>
                        
                        {conversation.tipo === 'grupo' && conversation.participants && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {conversation.participants.length} participantes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área de Chat */}
      <Card className="flex-1 flex flex-col">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Cabeçalho do Chat */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {conversations.find(c => c.id === activeConversation)?.tipo === 'grupo' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        getConversationName(conversations.find(c => c.id === activeConversation)!).charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {getConversationName(conversations.find(c => c.id === activeConversation)!)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {conversations.find(c => c.id === activeConversation)?.tipo === 'grupo' ? 'Grupo' : 'Individual'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Mensagens */}
            <CardContent className="flex-1 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === profile?.user_id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          message.sender_id === profile?.user_id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.sender_id !== profile?.user_id && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.sender_name}
                          </p>
                        )}
                        <p className="text-sm">{message.conteudo}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender_id === profile?.user_id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(message.created_at)}
                          {message.editada && ' (editada)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input de mensagem */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-0 h-10 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
