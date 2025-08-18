import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  MessageCircle, 
  Send, 
  X, 
  Users, 
  Plus, 
  Search, 
  Paperclip, 
  Image as ImageIcon,
  Download,
  Check,
  CheckCheck,
  UserPlus,
  Settings,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/usePostgreSQLAuth";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import apiService from "@/services/apiService";
import { toast } from "sonner";

interface User {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
}

interface Group {
  id: string;
  nome: string;
  descricao?: string;
  tipo: 'publico' | 'privado';
  criador_nome: string;
  meu_papel: string;
  total_participantes: number;
  mensagens_nao_lidas: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  remetente_id: string;
  destinatario_id?: string;
  grupo_id?: string;
  conteudo: string;
  tipo_mensagem: 'texto' | 'arquivo' | 'imagem';
  created_at: string;
  lida: boolean;
  lida_em?: string;
  remetente_nome?: string;
  arquivo_nome?: string;
  arquivo_url?: string;
  arquivo_tipo?: string;
  arquivo_tamanho?: number;
  editada: boolean;
  editada_em?: string;
}

interface Conversation {
  id: string;
  nome_usuario?: string;
  ultimo_contato?: string;
  count_mensagens: number;
  usuario_id?: string;
  tipo?: 'individual' | 'grupo';
}

export default function ChatAvancado() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations");
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Hooks
  const { profile } = useAuth();
  const { 
    isConnected, 
    onlineUsers, 
    newMessages, 
    unreadCount,
    sendMessage, 
    sendFileMessage,
    markAsRead,
    addMessageListener,
    clearNewMessages,
    isUserOnline,
    getOnlineUsers
  } = useSocket();

  // ====== EFEITOS ======
  
  useEffect(() => {
    if (profile?.user_id && isOpen) {
      loadInitialData();
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation, 1, true);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (activeGroup) {
      loadGroupMessages(activeGroup, 1, true);
    }
  }, [activeGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listener para novas mensagens via WebSocket
    const removeListener = addMessageListener((message: Message) => {
      // Se a mensagem é da conversa ativa, adicionar à lista
      if (
        (activeConversation && 
         (message.remetente_id === activeConversation || message.destinatario_id === activeConversation)) ||
        (activeGroup && message.grupo_id === activeGroup)
      ) {
        setMessages(prev => [...prev, message]);
        
        // Marcar como lida se for a conversa ativa
        if (message.remetente_id !== profile?.user_id) {
          markAsRead(message.id);
        }
      }
      
      // Atualizar lista de conversas
      loadConversations();
    });

    return removeListener;
  }, [activeConversation, activeGroup, addMessageListener, markAsRead, profile?.user_id]);

  // Busca com debounce
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ====== FUNÇÕES DE CARREGAMENTO ======
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadGroups(),
        loadConversations()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados do chat');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.getUsuariosConversa();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await apiService.getUserGroups();
      if (response.success && response.data) {
        setGroups(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiService.getConversasUsuario();
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadMessages = async (userId: string, pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      const response = await apiService.getMensagensUsuario(parseInt(userId), { 
        page: pageNum, 
        limit: 20 
      });
      
      if (response.success && response.data) {
        if (reset) {
          setMessages(response.data.reverse());
          setPage(1);
        } else {
          setMessages(prev => [...response.data.reverse(), ...prev]);
        }
        
        setHasMoreMessages(response.data.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMessages = async (groupId: string, pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      const response = await apiService.getGroupMessages(groupId, { 
        page: pageNum, 
        limit: 20 
      });
      
      if (response.success && response.data) {
        if (reset) {
          setMessages(response.data);
          setPage(1);
        } else {
          setMessages(prev => [...response.data, ...prev]);
        }
        
        setHasMoreMessages(response.data.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens do grupo:', error);
      toast.error('Erro ao carregar mensagens do grupo');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    try {
      const response = await apiService.searchMessages(query, { limit: 50 });
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar mensagens');
    }
  };

  // ====== FUNÇÕES DE ENVIO ======
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (activeGroup) {
        // Enviar para grupo
        const response = await apiService.sendGroupMessage(activeGroup, {
          conteudo: newMessage,
          tipo_mensagem: 'texto'
        });
        
        if (response.success) {
          setNewMessage("");
          // A mensagem aparecerá via WebSocket
        } else {
          throw new Error(response.message);
        }
      } else if (activeConversation) {
        // Enviar para usuário individual
        const success = sendMessage(activeConversation, newMessage, profile?.nome);
        
        if (success) {
          setNewMessage("");
        } else {
          // Fallback para API REST
          const response = await apiService.enviarMensagemUsuario({
            destinatario_id: parseInt(activeConversation),
            conteudo: newMessage
          });
          
          if (response.success) {
            setNewMessage("");
            loadMessages(activeConversation, 1, true);
          } else {
            throw new Error(response.message);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simular progresso
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const uploadResponse = await apiService.uploadMessageFile(file);
      
      clearInterval(interval);
      setUploadProgress(100);

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message);
      }

      const fileInfo = uploadResponse.data;

      if (activeGroup) {
        // Enviar arquivo para grupo
        await apiService.sendGroupMessage(activeGroup, {
          conteudo: `Arquivo: ${fileInfo.nome}`,
          tipo_mensagem: 'arquivo',
          arquivo_nome: fileInfo.nome,
          arquivo_url: fileInfo.url,
          arquivo_tipo: fileInfo.tipo,
          arquivo_tamanho: fileInfo.tamanho
        });
      } else if (activeConversation) {
        // Enviar arquivo para usuário
        const success = sendFileMessage(activeConversation, fileInfo, profile?.nome);
        
        if (!success) {
          // Fallback para API REST - implementar endpoint se necessário
          toast.error('Erro ao enviar arquivo via WebSocket');
        }
      }

      toast.success('Arquivo enviado com sucesso');
    } catch (error: unknown) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ====== FUNÇÕES AUXILIARES ======
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (tipo: string) => {
    if (tipo?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || loading) return;
    
    if (activeConversation) {
      await loadMessages(activeConversation, page + 1, false);
    } else if (activeGroup) {
      await loadGroupMessages(activeGroup, page + 1, false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await apiService.markMessageAsRead(messageId);
      
      // Atualizar localmente
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, lida: true, lida_em: new Date().toISOString() } : msg
      ));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // ====== COMPONENTES DE UI ======
  
  const renderMessage = (message: Message) => {
    const isMyMessage = message.remetente_id === profile?.user_id;
    const isOnline = isUserOnline(message.remetente_id);

    return (
      <div
        key={message.id}
        className={cn(
          "flex mb-4",
          isMyMessage ? "justify-end" : "justify-start"
        )}
      >
        <div className={cn(
          "max-w-[70%] group",
          isMyMessage ? "order-2" : "order-1"
        )}>
          {!isMyMessage && (
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {message.remetente_nome?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {message.remetente_nome}
              </span>
              {isOnline && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
          )}
          
          <div
            className={cn(
              "rounded-lg px-3 py-2 relative",
              isMyMessage
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            {message.tipo_mensagem === 'arquivo' && message.arquivo_url && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded border border-border/50">
                {getFileIcon(message.arquivo_tipo || '')}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.arquivo_nome}
                  </p>
                  <p className="text-xs opacity-70">
                    {formatFileSize(message.arquivo_tamanho || 0)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <a 
                    href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${message.arquivo_url}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
            
            <p className="text-sm">{message.conteudo}</p>
            
            <div className="flex items-center justify-between mt-1 gap-2">
              <span className="text-xs opacity-70">
                {formatTime(message.created_at)}
                {message.editada && (
                  <span className="ml-1">(editada)</span>
                )}
              </span>
              
              {isMyMessage && (
                <div className="flex items-center">
                  {message.lida ? (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              )}
            </div>
            
            {/* Menu de opções */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleMarkAsRead(message.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como lida
                </DropdownMenuItem>
                {isMyMessage && (
                  <>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg relative"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[420px] h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat Avançado
            <Badge variant="secondary" className="text-xs">
              {isConnected ? '🟢 Online' : '🔴 Offline'}
            </Badge>
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

      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 mx-3 mb-3">
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="search">Buscar</TabsTrigger>
          </TabsList>

          {/* Tab de Conversas */}
          <TabsContent value="conversations" className="flex-1 flex flex-col mt-0">
            {!activeConversation ? (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {loading ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Carregando conversas...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conversa encontrada</p>
                      <p className="text-xs mt-1">Inicie uma conversa na aba Usuários</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setActiveConversation(conversation.usuario_id || conversation.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {conversation.nome_usuario?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {isUserOnline(conversation.usuario_id || conversation.id) && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conversation.nome_usuario || 'Usuário'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.ultimo_contato 
                                ? `Última conversa: ${new Date(conversation.ultimo_contato).toLocaleDateString()}`
                                : 'Sem mensagens'
                              }
                            </p>
                          </div>
                          {conversation.count_mensagens > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {conversation.count_mensagens}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Header da conversa */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveConversation(null)}
                    >
                      ←
                    </Button>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {conversations.find(c => (c.usuario_id || c.id) === activeConversation)?.nome_usuario?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {conversations.find(c => (c.usuario_id || c.id) === activeConversation)?.nome_usuario || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isUserOnline(activeConversation) ? '🟢 Online' : '🔴 Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensagens */}
                <ScrollArea className="flex-1 p-3">
                  {hasMoreMessages && (
                    <div className="text-center mb-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={loadMoreMessages}
                        disabled={loading}
                      >
                        {loading ? 'Carregando...' : 'Carregar mensagens anteriores'}
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {messages.map(renderMessage)}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input de mensagem */}
                <div className="p-3 border-t border-border">
                  {uploading && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Enviando arquivo...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="min-h-0 max-h-32 resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || uploading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab de Grupos */}
          <TabsContent value="groups" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Meus Grupos</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Grupo</DialogTitle>
                        <DialogDescription>
                          Crie um grupo para conversar com múltiplos usuários
                        </DialogDescription>
                      </DialogHeader>
                      {/* Formulário de criação de grupo */}
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        setActiveGroup(group.id);
                        setActiveTab("conversations");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {group.tipo === 'publico' ? (
                            <Hash className="h-5 w-5 text-primary" />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {group.nome}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {group.tipo}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {group.total_participantes} participantes
                          </p>
                        </div>
                        {group.mensagens_nao_lidas > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {group.mensagens_nao_lidas}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab de Usuários */}
          <TabsContent value="users" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-3">
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Usuários Online</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {getOnlineUsers().map((user) => (
                      <div
                        key={user.user_id}
                        className="p-2 rounded border border-green-200 bg-green-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium truncate">
                            {user.nome}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Todos os Usuários</h3>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => {
                          setActiveConversation(user.id);
                          setActiveTab("conversations");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.nome?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {isUserOnline(user.id) && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.papel}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab de Busca */}
          <TabsContent value="search" className="flex-1 flex flex-col mt-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar mensagens..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3">
                {searchQuery.length >= 2 ? (
                  searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map((message) => (
                        <div key={message.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {message.remetente_nome?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {message.remetente_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm">{message.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma mensagem encontrada
                    </div>
                  )
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Digite pelo menos 2 caracteres para buscar</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Input de arquivo (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = '';
            }
          }}
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.mp3,.mp4,.avi"
        />
      </CardContent>
    </Card>
  );
}
