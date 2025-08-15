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
import { Plus, FolderKanban, Edit, Trash2, Calendar, Users, DollarSign, MapPin, AlertCircle } from "lucide-react";
import { apiFetch } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Projeto {
  id: number;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim?: string;
  status: string;
  responsavel_id: number;
  responsavel_nome?: string;
  orcamento?: number;
  localizacao?: string;
  total_oficinas?: number;
  ativo: boolean;
}

export default function Projetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Projeto | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    orcamento: '',
    localizacao: ''
  });

  useEffect(() => {
    carregarProjetos();
  }, []);

  const carregarProjetos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch('/api/projetos');
      
      if (response.success) {
        setProjetos(response.data || []);
      } else {
        setError(response.message || 'Erro ao carregar projetos');
      }
    } catch (err: any) {
      console.error('Erro ao carregar projetos:', err);
      setError(err.message || 'Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const projectData = {
        ...formData,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        data_fim: formData.data_fim || null
      };

      let response;
      if (editingProjeto) {
        response = await apiFetch(`/api/projetos/${editingProjeto.id}`, {
          method: 'PUT',
          body: JSON.stringify(projectData)
        });
      } else {
        response = await apiFetch('/api/projetos', {
          method: 'POST',
          body: JSON.stringify(projectData)
        });
      }

      if (response.success) {
        setDialogOpen(false);
        resetForm();
        carregarProjetos();
      } else {
        setError(response.message || 'Erro ao salvar projeto');
      }
    } catch (err: any) {
      console.error('Erro ao salvar projeto:', err);
      setError(err.message || 'Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (projeto: Projeto) => {
    setEditingProjeto(projeto);
    setFormData({
      nome: projeto.nome,
      descricao: projeto.descricao || '',
      data_inicio: projeto.data_inicio?.split('T')[0] || '',
      data_fim: projeto.data_fim?.split('T')[0] || '',
      status: projeto.status,
      orcamento: projeto.orcamento?.toString() || '',
      localizacao: projeto.localizacao || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProjeto(null);
    setFormData({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      status: 'ativo',
      orcamento: '',
      localizacao: ''
    });
  };

  const handleNewProject = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-red-100 text-red-800';
      case 'planejamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie os projetos do Instituto Move Marias
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewProject}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
              </DialogTitle>
              <DialogDescription>
                {editingProjeto ? 'Atualize as informações do projeto' : 'Crie um novo projeto para o instituto'}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Projeto *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Fim</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orcamento">Orçamento</Label>
                  <Input
                    id="orcamento"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.orcamento}
                    onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Local onde será realizado"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : (editingProjeto ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !dialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {projetos.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro projeto para começar
            </p>
            <Button onClick={handleNewProject}>
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
                      <FolderKanban className="h-5 w-5" />
                      {projeto.nome}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusBadgeColor(projeto.status)}>
                        {projeto.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(projeto)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <CardDescription className="line-clamp-3">
                  {projeto.descricao || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Início: {format(new Date(projeto.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  
                  {projeto.data_fim && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Fim: {format(new Date(projeto.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  
                  {projeto.total_oficinas !== undefined && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Oficinas: {projeto.total_oficinas}</span>
                    </div>
                  )}
                  
                  {projeto.orcamento && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(projeto.orcamento)}
                      </span>
                    </div>
                  )}
                  
                  {projeto.localizacao && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{projeto.localizacao}</span>
                    </div>
                  )}
                  
                  {projeto.responsavel_nome && (
                    <div className="text-xs pt-2">
                      Responsável: {projeto.responsavel_nome}
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
