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
import { Plus, Users, Calendar, Clock, MapPin, Edit, Trash2, AlertCircle, CheckCircle, GraduationCap, User, Target } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/lib/api';

interface Oficina {
  id: number;
  nome: string;
  descricao?: string;
  instrutor?: string;
  data_inicio: string;
  data_fim?: string;
  horario_inicio: string;
  horario_fim: string;
  local?: string;
  vagas_totais: number;
  vagas_ocupadas?: number;
  status: 'ativa' | 'inativa' | 'pausada' | 'concluida';
  ativo: boolean;
  projeto_id?: number;
  projeto_nome?: string;
  responsavel_id?: number;
  responsavel_nome?: string;
  total_participantes?: number;
  data_criacao: string;
  data_atualizacao: string;
}

interface Projeto {
  id: number;
  nome: string;
  descricao?: string;
  status: string;
}

export default function OficinasNew() {
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState<Oficina | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    instrutor: '',
    data_inicio: '',
    data_fim: '',
    horario_inicio: '',
    horario_fim: '',
    local: '',
    vagas_totais: 20,
    status: 'ativa' as 'ativa' | 'inativa' | 'pausada' | 'concluida',
    projeto_id: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    await Promise.all([carregarOficinas(), carregarProjetos()]);
  };

  const carregarOficinas = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/oficinas');
      if (response.success) {
        setOficinas(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar oficinas:', error);
      setError('Erro ao carregar oficinas');
    } finally {
      setLoading(false);
    }
  };

  const carregarProjetos = async () => {
    try {
      const response = await apiFetch('/api/projetos');
      console.log('Resposta da API projetos:', response);
      if (response.success) {
        console.log('Projetos recebidos:', response.data);
        // Permitir projetos em planejamento ou em andamento para associação
        const projetosFiltrados = response.data.filter((p: Projeto) => 
          p.status === 'planejamento' || p.status === 'em_andamento'
        );
        console.log('Projetos após filtragem:', projetosFiltrados);
        setProjetos(projetosFiltrados);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const dados = {
        ...formData,
        vagas_totais: parseInt(formData.vagas_totais.toString()),
        projeto_id: formData.projeto_id && formData.projeto_id !== 'none' ? parseInt(formData.projeto_id) : null,
        data_fim: formData.data_fim || null
      };

      const response = editingOficina 
        ? await apiFetch(`/api/oficinas/${editingOficina.id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
          })
        : await apiFetch('/api/oficinas', {
            method: 'POST',
            body: JSON.stringify(dados)
          });

      if (response.success) {
        setSuccess(editingOficina ? 'Oficina atualizada com sucesso!' : 'Oficina criada com sucesso!');
        setDialogOpen(false);
        resetForm();
        carregarOficinas();
      } else {
        setError(response.message || 'Erro ao salvar oficina');
      }
    } catch (error) {
      setError('Erro ao salvar oficina');
      console.error('Erro ao salvar oficina:', error);
    }
  };

  const handleEdit = (oficina: Oficina) => {
    setEditingOficina(oficina);
    setFormData({
      nome: oficina.nome,
      descricao: oficina.descricao || '',
      instrutor: oficina.instrutor || '',
      data_inicio: oficina.data_inicio,
      data_fim: oficina.data_fim || '',
      horario_inicio: oficina.horario_inicio,
      horario_fim: oficina.horario_fim,
      local: oficina.local || '',
      vagas_totais: oficina.vagas_totais,
      status: oficina.status || 'ativa',
      projeto_id: oficina.projeto_id?.toString() || 'none'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta oficina?')) return;

    try {
      const response = await apiFetch(`/api/oficinas/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        setSuccess('Oficina excluída com sucesso!');
        carregarOficinas();
      } else {
        setError('Erro ao excluir oficina');
      }
    } catch (error) {
      setError('Erro ao excluir oficina');
      console.error('Erro ao excluir oficina:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      instrutor: '',
      data_inicio: '',
      data_fim: '',
      horario_inicio: '',
      horario_fim: '',
      local: '',
      vagas_totais: 20,
      status: 'ativa',
      projeto_id: 'none'
    });
    setEditingOficina(null);
    setError(null);
  };

  const getStatusColor = (status: string, vagas_totais: number, vagas_ocupadas: number = 0) => {
    if (status === 'inativa' || status === 'pausada') return 'bg-red-100 text-red-800';
    if (status === 'concluida') return 'bg-primary/10 text-primary';
    if (vagas_ocupadas >= vagas_totais) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (status: string, vagas_totais: number, vagas_ocupadas: number = 0) => {
    if (status === 'inativa') return 'Inativa';
    if (status === 'pausada') return 'Pausada';
    if (status === 'concluida') return 'Concluída';
    if (status === 'ativa' && vagas_ocupadas >= vagas_totais) return 'Lotada';
    return 'Ativa';
  };

  const getVagasDisponiveis = (vagas_totais: number, vagas_ocupadas: number = 0) => {
    return Math.max(0, vagas_totais - vagas_ocupadas);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oficinas</h1>
          <p className="text-muted-foreground">
            Gerencie as oficinas do Instituto Move Marias ({oficinas.length} {oficinas.length === 1 ? 'oficina' : 'oficinas'})
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Oficina
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOficina ? 'Editar Oficina' : 'Nova Oficina'}
              </DialogTitle>
              <DialogDescription>
                {editingOficina ? 'Edite as informações da oficina' : 'Crie uma nova oficina para o instituto'}
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
                  <Label htmlFor="nome">Nome da Oficina *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Curso de Informática Básica"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o conteúdo e objetivos da oficina"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instrutor">Instrutor</Label>
                    <Input
                      id="instrutor"
                      value={formData.instrutor}
                      onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
                      placeholder="Nome do instrutor"
                    />
                  </div>

                  <div>
                    <Label htmlFor="projeto_id">Projeto Associado</Label>
                    <Select value={formData.projeto_id} onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um projeto (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum projeto</SelectItem>
                        {projetos.map(projeto => (
                          <SelectItem key={projeto.id} value={projeto.id.toString()}>
                            {projeto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="data_fim">Data de Fim</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="horario_inicio">Horário de Início *</Label>
                    <Input
                      id="horario_inicio"
                      type="time"
                      value={formData.horario_inicio}
                      onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="horario_fim">Horário de Fim *</Label>
                    <Input
                      id="horario_fim"
                      type="time"
                      value={formData.horario_fim}
                      onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="local">Local</Label>
                    <Input
                      id="local"
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      placeholder="Ex: Sala 1, Laboratório, Online"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vagas_totais">Vagas Totais *</Label>
                    <Input
                      id="vagas_totais"
                      type="number"
                      min="1"
                      value={formData.vagas_totais}
                      onChange={(e) => setFormData({ ...formData, vagas_totais: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status da Oficina</Label>
                  <Select value={formData.status} onValueChange={(value: Oficina['status']) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
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
                  {editingOficina ? 'Salvar Alterações' : 'Criar Oficina'}
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : oficinas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma oficina encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando sua primeira oficina para organizar as atividades educativas do instituto.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Oficina
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {oficinas.map((oficina) => (
            <Card key={oficina.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="h-5 w-5" />
                      {oficina.nome}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {oficina.descricao || 'Sem descrição disponível'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(oficina)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(oficina.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(oficina.status, oficina.vagas_totais, oficina.vagas_ocupadas || 0)}>
                    {getStatusText(oficina.status, oficina.vagas_totais, oficina.vagas_ocupadas || 0)}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {oficina.vagas_ocupadas || 0}/{oficina.vagas_totais} vagas
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(oficina.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      {oficina.data_fim && (
                        <> até {format(new Date(oficina.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {oficina.horario_inicio} às {oficina.horario_fim}
                    </span>
                  </div>

                  {oficina.instrutor && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{oficina.instrutor}</span>
                    </div>
                  )}

                  {oficina.projeto_nome && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>{oficina.projeto_nome}</span>
                    </div>
                  )}

                  {oficina.local && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{oficina.local}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar para ocupação */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ocupação</span>
                    <span>{Math.round(((oficina.vagas_ocupadas || 0) / oficina.vagas_totais) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${Math.min(((oficina.vagas_ocupadas || 0) / oficina.vagas_totais) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getVagasDisponiveis(oficina.vagas_totais, oficina.vagas_ocupadas)} vagas disponíveis
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
