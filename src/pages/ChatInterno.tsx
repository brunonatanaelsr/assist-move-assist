import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, User, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Interfaces
interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
}

interface Mensagem {
  id: number;
  autor_id: number;
  destinatario_id: number;
  conteudo: string;
  lida: boolean;
  data_publicacao: string;
  ativo: boolean;
}

export default function ChatInterno() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [conversas, setConversas] = useState<Mensagem[]>([]);
  const [mensagensConversa, setMensagensConversa] = useState<Mensagem[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(true);

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      carregarDados();
    }
  }, [user]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Erro',
          description: 'Token de autenticação não encontrado',
          variant: 'destructive',
        });
        return;
      }
      
      // Carregar usuários
      const responseUsuarios = await fetch('/api/mensagens/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (responseUsuarios.ok) {
        const dataUsuarios = await responseUsuarios.json();
        setUsuarios(dataUsuarios);
      }

      // Carregar conversas
      const responseConversas = await fetch('/api/mensagens/conversas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (responseConversas.ok) {
        const dataConversas = await responseConversas.json();
        setConversas(dataConversas.data || []);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa específica
  const carregarConversa = async (usuario: Usuario) => {
    try {
      setUsuarioSelecionado(usuario);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/mensagens/conversa/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMensagensConversa(data.data || []);
      }
      
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conversa',
        variant: 'destructive',
      });
    }
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !usuarioSelecionado) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/mensagens/enviar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destinatario_id: usuarioSelecionado.id,
          conteudo: novaMensagem.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMensagensConversa(prev => [...prev, data.data]);
        setNovaMensagem("");
        
        toast({
          title: 'Sucesso',
          description: 'Mensagem enviada!',
        });
      } else {
        throw new Error('Erro ao enviar mensagem');
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  };

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Chat Interno</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Lista de usuários */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Usuários ({usuarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 p-4">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    onClick={() => carregarConversa(usuario)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                      ${usuarioSelecionado?.id === usuario.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'}
                    `}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(usuario.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{usuario.nome}</p>
                      <p className="text-xs text-gray-500">{usuario.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área de conversa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {usuarioSelecionado ? `Conversa com ${usuarioSelecionado.nome}` : 'Selecione um usuário'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[500px]">
            {usuarioSelecionado ? (
              <>
                {/* Mensagens */}
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4 p-2">
                    {mensagensConversa.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                      </div>
                    ) : (
                      mensagensConversa.map((mensagem) => (
                        <div
                          key={mensagem.id}
                          className={`
                            flex gap-3 ${mensagem.autor_id === user?.id ? 'justify-end' : 'justify-start'}
                          `}
                        >
                          <div
                            className={`
                              max-w-xs lg:max-w-md px-4 py-3 rounded-lg
                              ${mensagem.autor_id === user?.id
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-gray-100 text-gray-900'
                              }
                            `}
                          >
                            <p className="text-sm">{mensagem.conteudo}</p>
                            <div className="flex items-center gap-1 mt-2 opacity-70">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">{formatarData(mensagem.data_publicacao)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Input de nova mensagem */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={enviarMensagem} disabled={!novaMensagem.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione um usuário para iniciar uma conversa</p>
                  <p className="text-sm mt-1">Clique em um usuário na lista à esquerda</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
