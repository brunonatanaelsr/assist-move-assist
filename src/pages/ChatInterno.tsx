import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Users, 
  Clock, 
  Check,
  CheckCheck,
  Plus,
  Smile
} from 'lucide-react';
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';

// Interfaces
interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
}

interface Conversa {
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  total_mensagens?: number;
  nao_lidas: number;
  ultima_mensagem_data: string;
  ultima_mensagem: string;
}

interface ApiMensagem {
  id: number;
  data_publicacao: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  autor_id: number;
  autor_nome?: string;
  autor_email?: string;
  destinatario_tipo: string;
  destinatario_id: number;
  destinatario_nome?: string;
  destinatario_email?: string;
  data_expiracao?: string;
  ativo: boolean;
  lida: boolean;
  anexo_url?: string;
  prioridade: string | number;
}

type Mensagem = ApiMensagem;

export default function ChatInterno() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [buscarUsuario, setBuscarUsuario] = useState('');
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  
  // Refs
  const mensagensEndRef = useRef<HTMLDivElement>(null);
  
  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  // Auto scroll para última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Escutar por novas mensagens
  useEffect(() => {
    if (conversaAtiva?.usuario_id && user?.id) {
      const eventSource = new EventSource(`/api/mensagens/stream?userId=${user.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.remetente_id === conversaAtiva.usuario_id || 
            data.destinatario_id === conversaAtiva.usuario_id
          ) {
            setMensagens(prev => [...prev, data]);
          }
          // Recarregar conversas para atualizar contadores
          loadData();
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      return () => {
        eventSource.close();
      };
    }
  }, [conversaAtiva?.usuario_id, user?.id]);

  const scrollToBottom = () => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Buscar todas as mensagens onde o usuário é autor ou destinatário
      const mensagensResponse = await apiService.get<ApiMensagem[]>('/mensagens/conversas');
      
      if (mensagensResponse.success && Array.isArray(mensagensResponse.data)) {
        const mensagensPorUsuario = mensagensResponse.data.reduce<Record<number, Conversa>>((acc, msg) => {
          const outroUsuarioId = msg.autor_id === user.id ? msg.destinatario_id : msg.autor_id;
          if (!acc[outroUsuarioId]) {
            acc[outroUsuarioId] = {
              usuario_id: outroUsuarioId,
              usuario_nome: msg.autor_id === user.id ? msg.destinatario_nome || 'Usuário' : msg.autor_nome || 'Usuário',
              usuario_email: msg.autor_id === user.id ? msg.destinatario_email || '' : msg.autor_email || '',
              ultima_mensagem: msg.conteudo,
              ultima_mensagem_data: msg.data_publicacao,
              nao_lidas: msg.destinatario_id === user.id && !msg.lida ? 1 : 0
            };
          }
          return acc;
        }, {});

        setConversas(Object.values(mensagensPorUsuario));
      }
      
      // Buscar usuários disponíveis para conversa
      const usuariosResponse = await apiService.get<Usuario[]>('/mensagens/usuarios');
      if (usuariosResponse.success && Array.isArray(usuariosResponse.data)) {
        setUsuarios(usuariosResponse.data);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conversas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMensagensConversa = async (conversa: Conversa) => {
    try {
      setConversaAtiva(conversa);
      setMensagens([]);
      
      const response = await apiService.getMensagensUsuario(conversa.usuario_id);
      
      if (response.success) {
        setMensagens(response.data || []);
      }
      
      // Recarregar conversas para atualizar contadores
      await loadData();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
        variant: 'destructive',
      });
    }
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novaMensagem.trim() || !conversaAtiva || !user?.id) return;

    try {
      setEnviandoMensagem(true);
      
      const response = await apiService.enviarMensagemUsuario({
        titulo: 'Chat Interno',
        conteudo: novaMensagem.trim(),
        autor_id: user.id,
        destinatario_id: conversaAtiva.usuario_id,
        destinatario_tipo: 'individual',
        tipo: 'mensagem',
        prioridade: 1
      });

      if (response.success) {
        setNovaMensagem('');
        
        // Adicionar mensagem à lista local para feedback imediato
        const novaMensagemObj: Mensagem = {
          ...response.data,
          id: response.data.id,
          data_publicacao: response.data.data_publicacao,
          autor_id: user.id,
          destinatario_id: conversaAtiva.usuario_id,
          conteudo: novaMensagem.trim(),
          lida: false
        };
        
        setMensagens(prev => [...prev, novaMensagemObj]);
        
        // Recarregar conversas para atualizar contadores
        await loadData();
        
        toast({
          title: 'Sucesso',
          description: 'Mensagem enviada!',
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const iniciarNovaConversa = async (usuario: Usuario) => {
    // Verificar se já existe conversa
    const conversaExistente = conversas.find(c => c.usuario_id === usuario.id);
    
    if (conversaExistente) {
      await loadMensagensConversa(conversaExistente);
    } else {
      // Criar nova conversa (simulada)
      const novaConversa: Conversa = {
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        usuario_email: usuario.email,
        total_mensagens: 0,
        nao_lidas: 0,
        ultima_mensagem_data: new Date().toISOString(),
        ultima_mensagem: ''
      };
      
      setConversaAtiva(novaConversa);
      setMensagens([]);
    }
    
    setShowNovaConversa(false);
    setBuscarUsuario('');
  };

  const formatarHora = (dataString: string) => {
    if (!dataString) return '--:--';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return '--:--';
    return data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Data inválida';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return 'Data inválida';
    
    const hoje = new Date();
    
    if (data.toDateString() === hoje.toDateString()) {
      return formatarHora(dataString);
    }
    
    return data.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getInitials = (nome?: string | null) => {
    if (!nome) return 'UN';
    
    return nome
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };  const usuariosFiltrados = usuarios.filter(u => 
    u.nome.toLowerCase().includes(buscarUsuario.toLowerCase()) ||
    u.email.toLowerCase().includes(buscarUsuario.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Carregando chat interno...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Interno</h1>
            <p className="text-gray-600">Converse com outros usuários do sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Lista de Conversas */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Conversas</CardTitle>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowNovaConversa(!showNovaConversa)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNovaConversa && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={buscarUsuario}
                      onChange={(e) => setBuscarUsuario(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {buscarUsuario && (
                    <ScrollArea className="max-h-40">
                      {usuariosFiltrados.map(usuario => (
                        <div
                          key={usuario.id}
                          onClick={() => iniciarNovaConversa(usuario)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(usuario.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{usuario.nome}</p>
                            <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
                          </div>
                          <Badge variant={usuario.papel === 'superadmin' ? 'destructive' : 'secondary'} className="text-xs">
                            {usuario.papel}
                          </Badge>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {conversas.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhuma conversa ainda</p>
                    <p className="text-xs">Clique em + para iniciar</p>
                  </div>
                ) : (
                  conversas.map((conversa) => (
                    <div
                      key={conversa.usuario_id}
                      onClick={() => loadMensagensConversa(conversa)}
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                        conversaAtiva?.usuario_id === conversa.usuario_id ? 'bg-primary/10 border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(conversa.usuario_nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{conversa.usuario_nome}</h4>
                            <span className="text-xs text-gray-500">
                              {formatarData(conversa.ultima_mensagem_data)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 truncate">
                              {conversa.ultima_mensagem || 'Sem mensagens'}
                            </p>
                            {conversa.nao_lidas > 0 && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                {conversa.nao_lidas}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            {conversaAtiva ? (
              <>
                {/* Header da Conversa */}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(conversaAtiva.usuario_nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{conversaAtiva.usuario_nome}</h3>
                      <p className="text-sm text-gray-500">{conversaAtiva.usuario_email}</p>
                    </div>
                  </div>
                </CardHeader>

                {/* Área de Mensagens */}
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {mensagens.map((mensagem) => {
                        const isFromMe = mensagem.autor_id === user?.id;
                        
                        return (
                          <div
                            key={mensagem.id}
                            className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isFromMe
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{mensagem.conteudo}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 ${
                                isFromMe ? 'text-primary-foreground/80' : 'text-gray-500'
                              }`}>
                                <span className="text-xs">
                                  {formatarHora(mensagem.data_publicacao)}
                                </span>
                                {isFromMe && (
                                  <div className="flex">
                                    {mensagem.lida ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={mensagensEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input de Nova Mensagem */}
                  <div className="p-4 border-t">
                    <form onSubmit={enviarMensagem} className="flex gap-2">
                      <Input
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        disabled={enviandoMensagem}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        disabled={!novaMensagem.trim() || enviandoMensagem}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                  <p>Escolha uma conversa da lista ou inicie uma nova</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
