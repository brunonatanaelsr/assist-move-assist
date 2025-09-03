import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, FolderKanban, Edit, Trash2, Users, Calendar, MapPin, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiService } from '@/services/apiService';

interface Projeto {
  id: number;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim_prevista?: string;
  status: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  responsavel_id: number;
  responsavel_nome?: string;
  orcamento?: number;
  local_execucao?: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  total_oficinas?: number;
}

export default function Projetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Projeto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim_prevista: '',
    status: 'planejamento' as 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado',
    orcamento: '',
    localizacao: ''
  });

  useEffect(() => {
    carregarProjetos();
  }, []);

  const carregarProjetos = async () => {
    try {
      setLoading(true);
      // Adicionando timestamp para evitar cache
      const response = await apiService.get(`/projetos?_t=${Date.now()}`);
      console.log('Resposta completa da API:', response);
      if (response.success) {
        console.log('Projetos carregados:', response.data);
        setProjetos(response.data);
      } else {
        console.error('Erro na resposta da API:', response);
        setError(response.message || 'Erro ao carregar projetos');
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      setError('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const dados = {
        ...formData,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        data_fim_prevista: formData.data_fim_prevista || null
      };

      console.log('Dados sendo enviados:', dados);
      console.log('ID do projeto sendo editado:', editingProjeto?.id);

      const response = editingProjeto 
        ? await apiService.updateProjeto(editingProjeto.id.toString(), dados)
        : await apiService.createProjeto(dados);

      console.log('Resposta da atualização:', response);

      if (response.success) {
        setSuccess(editingProjeto ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');
        setDialogOpen(false);
        resetForm();
        console.log('Recarregando projetos...');
        await carregarProjetos();
        console.log('Projetos recarregados');
      } else {
        setError(response.message || 'Erro ao salvar projeto');
      }
    } catch (error) {
      setError('Erro ao salvar projeto');
      console.error('Erro ao salvar projeto:', error);
    }
  };

  const handleEdit = (projeto: Projeto) => {
    setEditingProjeto(projeto);
    setFormData({
      nome: projeto.nome,
      descricao: projeto.descricao || '',
      data_inicio: projeto.data_inicio,
      data_fim_prevista: projeto.data_fim_prevista || '',
      status: projeto.status,
      orcamento: projeto.orcamento?.toString() || '',
      localizacao: projeto.local_execucao || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    try {
      const response = await apiService.deleteProjeto(id.toString());

      if (response.success) {
        setSuccess('Projeto excluído com sucesso!');
        carregarProjetos();
      } else {
        setError('Erro ao excluir projeto');
      }
    } catch (error) {
      setError('Erro ao excluir projeto');
      console.error('Erro ao excluir projeto:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim_prevista: '',
      status: 'planejamento',
      orcamento: '',
      localizacao: ''
    });
    setEditingProjeto(null);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejamento': return 'bg-blue-100 text-blue-800';
      case 'em_andamento': return 'bg-green-100 text-green-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800';
      case 'concluido': return 'bg-primary/10 text-primary';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planejamento': return <FolderKanban className="h-4 w-4" />;
      case 'em_andamento': return <CheckCircle className="h-4 w-4" />;
      case 'pausado': return <AlertCircle className="h-4 w-4" />;
      case 'concluido': return <CheckCircle className="h-4 w-4" />;
      case 'cancelado': return <AlertCircle className="h-4 w-4" />;
      default: return <FolderKanban className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie os projetos do Instituto Move Marias ({projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'})
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
              </DialogTitle>
              <DialogDescription>
                {editingProjeto ? 'Edite as informações do projeto' : 'Crie um novo projeto para o instituto'}
              </DialogDescription>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="nome">Nome do Projeto *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Capacitação em Culinária"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva os objetivos e atividades do projeto"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_inicio">Data de Início *</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_fim_prevista">Data de Fim Prevista</Label>
                    <Input
                      id="data_fim_prevista"
                      type="date"
                      value={formData.data_fim_prevista}
                      onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejamento">Planejamento</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="orcamento">Orçamento (R$)</Label>
                    <Input
                      id="orcamento"
                      type="number"
                      step="0.01"
                      value={formData.orcamento}
                      onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Ex: Sede do Instituto, Endereço específico"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProjeto ? 'Salvar Alterações' : 'Criar Projeto'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projetos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando seu primeiro projeto para organizar as atividades do instituto.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projetos.map((projeto) => (
            <Card key={projeto.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getStatusIcon(projeto.status)}
                      {projeto.nome}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {projeto.descricao || 'Sem descrição disponível'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(projeto)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(projeto.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(projeto.status)}>
                    {projeto.status.charAt(0).toUpperCase() + projeto.status.slice(1)}
                  </Badge>
                  {projeto.total_oficinas && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {projeto.total_oficinas} {projeto.total_oficinas === 1 ? 'oficina' : 'oficinas'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(projeto.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      {projeto.data_fim_prevista && (
                        <> até {format(new Date(projeto.data_fim_prevista), 'dd/MM/yyyy', { locale: ptBR })}</>
                      )}
                    </span>
                  </div>

                  {projeto.responsavel_nome && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{projeto.responsavel_nome}</span>
                    </div>
                  )}

                  {projeto.orcamento && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projeto.orcamento)}</span>
                    </div>
                  )}

                  {projeto.local_execucao && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{projeto.local_execucao}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
