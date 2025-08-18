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
import { MessageSquare, Send, Plus, Search, Filter, User, Calendar, Clock, AlertCircle } from "lucide-react";
import { apiService } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import type { Mensagem } from '@/types';

interface Conversa {
  beneficiaria_id: number;
  beneficiaria_nome: string;
  total_mensagens: number;
  nao_lidas: number;
  ultima_mensagem_data: string;
  ultimo_assunto: string;
}

export default function MensagensReal() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
  const [mensagensConversa, setMensagensConversa] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("all");
  type NovaMensagem = Pick<Mensagem, 'assunto' | 'conteudo' | 'tipo' | 'prioridade' | 'beneficiaria_id'>;
  const [novaMensagem, setNovaMensagem] = useState<NovaMensagem>({
    assunto: "",
    conteudo: "",
    tipo: "mensagem",
    prioridade: "normal",
    beneficiaria_id: null
  });
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar todas as mensagens
      const mensagensResponse = await apiService.getMensagens();
      if (mensagensResponse.success) {
        setMensagens(mensagensResponse.data || []);
      }

      // Carregar conversas agrupadas por beneficiária
      const conversasResponse = await apiService.getConversasBeneficiarias();
      if (conversasResponse.success) {
        setConversas(conversasResponse.data || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConversa = async (conversa: Conversa) => {
    try {
      setConversaAtiva(conversa);
      const response = await apiService.getMensagensConversa(conversa.beneficiaria_id);
      if (response.success) {
        setMensagensConversa(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a conversa",
        variant: "destructive"
      });
    }
  };

  const enviarMensagem = async () => {
    try {
      if (!novaMensagem.assunto || !novaMensagem.conteudo) {
        toast({
          title: "Erro",
          description: "Assunto e conteúdo são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const response = await apiService.enviarMensagem(novaMensagem);
      if (response.success) {
        toast({
          title: "Sucesso",
          description: "Mensagem enviada com sucesso"
        });
        setNovaMensagem({
          assunto: "",
          conteudo: "",
          tipo: "mensagem",
          prioridade: "normal",
          beneficiaria_id: null
        });
        setShowNewMessageDialog(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    }
  };

  const marcarComoLida = async (mensagemId: number) => {
    try {
      const response = await apiService.marcarMensagemLida(mensagemId, true);
      if (response.success) {
        // Atualizar estado local
        setMensagens(prev => prev.map(m => 
          m.id === mensagemId ? { ...m, lida: true, data_leitura: new Date().toISOString() } : m
        ));
        setMensagensConversa(prev => prev.map(m => 
          m.id === mensagemId ? { ...m, lida: true, data_leitura: new Date().toISOString() } : m
        ));
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'baixa': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return <AlertCircle className="h-4 w-4" />;
      case 'lembrete': return <Clock className="h-4 w-4" />;
      case 'notificacao': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const mensagensFiltradas = mensagens.filter(mensagem => {
    const matchSearch = searchTerm === "" || 
      mensagem.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mensagem.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTipo = filterTipo === "all" || mensagem.tipo === filterTipo;
    const matchPrioridade = filterPrioridade === "all" || mensagem.prioridade === filterPrioridade;
    
    return matchSearch && matchTipo && matchPrioridade;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie mensagens e conversas com beneficiárias
          </p>
        </div>

        <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assunto</label>
                <Input
                  value={novaMensagem.assunto}
                  onChange={(e) => setNovaMensagem(prev => ({ ...prev, assunto: e.target.value }))}
                  placeholder="Digite o assunto da mensagem"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  value={novaMensagem.conteudo}
                  onChange={(e) => setNovaMensagem(prev => ({ ...prev, conteudo: e.target.value }))}
                  placeholder="Digite o conteúdo da mensagem"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <Select
                    value={novaMensagem.tipo}
                    onValueChange={(value: Mensagem['tipo']) => setNovaMensagem(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensagem">Mensagem</SelectItem>
                      <SelectItem value="notificacao">Notificação</SelectItem>
                      <SelectItem value="lembrete">Lembrete</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select
                    value={novaMensagem.prioridade}
                    onValueChange={(value: Mensagem['prioridade']) => setNovaMensagem(prev => ({ ...prev, prioridade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={enviarMensagem}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="mensagens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mensagens">Todas as Mensagens</TabsTrigger>
          <TabsTrigger value="conversas">Conversas por Beneficiária</TabsTrigger>
        </TabsList>

        <TabsContent value="mensagens" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar mensagens..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="mensagem">Mensagem</SelectItem>
                    <SelectItem value="notificacao">Notificação</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas prioridades</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Mensagens */}
          <div className="space-y-4">
            {mensagensFiltradas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma mensagem encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterTipo !== 'all' || filterPrioridade !== 'all' 
                      ? "Tente ajustar os filtros de busca"
                      : "Ainda não há mensagens no sistema"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              mensagensFiltradas.map(mensagem => (
                <Card 
                  key={mensagem.id} 
                  className={`cursor-pointer transition-colors ${
                    !mensagem.lida ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => !mensagem.lida && marcarComoLida(mensagem.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTipoIcon(mensagem.tipo)}
                          <h3 className="font-medium">{mensagem.assunto}</h3>
                          {!mensagem.lida && (
                            <Badge variant="secondary" className="text-xs">Nova</Badge>
                          )}
                          <Badge className={`text-xs ${getPrioridadeColor(mensagem.prioridade)}`}>
                            {mensagem.prioridade}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {mensagem.conteudo}
                        </p>
                        
                        <div className="flex items-center text-xs text-muted-foreground space-x-4">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>De: {mensagem.remetente_nome}</span>
                          </div>
                          {mensagem.beneficiaria_nome && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Beneficiária: {mensagem.beneficiaria_nome}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(mensagem.data_criacao).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Conversas */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conversas por Beneficiária</CardTitle>
                  <CardDescription>Clique para ver as mensagens</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    {conversas.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhuma conversa encontrada
                      </div>
                    ) : (
                      conversas.map(conversa => (
                        <div
                          key={conversa.beneficiaria_id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            conversaAtiva?.beneficiaria_id === conversa.beneficiaria_id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => loadConversa(conversa)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{conversa.beneficiaria_nome}</h4>
                            {conversa.nao_lidas > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversa.nao_lidas}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {conversa.ultimo_assunto}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(conversa.ultima_mensagem_data).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Mensagens da Conversa Ativa */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {conversaAtiva ? `Conversa com ${conversaAtiva.beneficiaria_nome}` : 'Selecione uma conversa'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!conversaAtiva ? (
                    <div className="text-center p-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Selecione uma conversa para ver as mensagens
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {mensagensConversa.map(mensagem => (
                          <div
                            key={mensagem.id}
                            className={`p-3 rounded-lg ${
                              !mensagem.lida ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                            }`}
                            onClick={() => !mensagem.lida && marcarComoLida(mensagem.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getTipoIcon(mensagem.tipo)}
                                <h4 className="font-medium text-sm">{mensagem.assunto}</h4>
                                <Badge className={`text-xs ${getPrioridadeColor(mensagem.prioridade)}`}>
                                  {mensagem.prioridade}
                                </Badge>
                                {!mensagem.lida && (
                                  <Badge variant="secondary" className="text-xs">Nova</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm mb-2">{mensagem.conteudo}</p>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>De: {mensagem.remetente_nome}</span>
                              <span>{new Date(mensagem.data_criacao).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
