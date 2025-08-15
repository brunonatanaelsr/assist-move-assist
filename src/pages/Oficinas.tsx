import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Calendar, Clock, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/apiService';
import { formatDisplayDate, formatInputDate } from '@/utils/dateFormatter';

interface Oficina {
  id: string;
  nome: string;
  descricao: string;
  instrutor: string;
  data_inicio: string;
  data_fim?: string;
  horario_inicio: string;
  horario_fim: string;
  vagas_totais: number;
  vagas_ocupadas?: number;
  ativa: boolean;
  local?: string;
}

const Oficinas = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOficina, setSelectedOficina] = useState<Oficina | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    instrutor: '',
    data_inicio: '',
    data_fim: '',
    horario_inicio: '',
    horario_fim: '',
    local: '',
    vagas_totais: 10,
    ativa: true
  });

  const loadOficinas = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOficinas();
      setOficinas(response?.data || []);
    } catch (error) {
      console.error('Erro ao carregar oficinas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as oficinas.",
        variant: "destructive",
      });
      setOficinas([]); // Garantir que seja um array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOficinas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedOficina) {
        await apiService.updateOficina(selectedOficina.id, formData);
        toast({ title: "Sucesso", description: "Oficina atualizada com sucesso!" });
      } else {
        await apiService.createOficina(formData);
        toast({ title: "Sucesso", description: "Oficina criada com sucesso!" });
      }
      
      setShowForm(false);
      setSelectedOficina(null);
      resetForm();
      loadOficinas();
    } catch (error) {
      console.error('Erro ao salvar oficina:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a oficina.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oficina?')) return;
    
    try {
      await apiService.deleteOficina(id);
      toast({ title: "Sucesso", description: "Oficina excluída com sucesso!" });
      loadOficinas();
    } catch (error) {
      console.error('Erro ao excluir oficina:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a oficina.",
        variant: "destructive",
      });
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
      vagas_totais: 10,
      ativa: true
    });
  };

  const openEditForm = (oficina: Oficina) => {
    setSelectedOficina(oficina);
    setFormData({
      nome: oficina.nome,
      descricao: oficina.descricao,
      instrutor: oficina.instrutor,
      data_inicio: formatInputDate(oficina.data_inicio),
      data_fim: formatInputDate(oficina.data_fim) || '',
      horario_inicio: oficina.horario_inicio,
      horario_fim: oficina.horario_fim,
      local: oficina.local || '',
      vagas_totais: oficina.vagas_totais,
      ativa: oficina.ativa
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setSelectedOficina(null);
    resetForm();
    setShowForm(true);
  };

  const filteredOficinas = Array.isArray(oficinas) ? oficinas.filter(oficina => {
    const matchesSearch = oficina.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         oficina.instrutor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filtroStatus === 'todas' || 
                         (filtroStatus === 'ativas' && oficina.ativa) ||
                         (filtroStatus === 'inativas' && !oficina.ativa);
    
    return matchesSearch && matchesStatus;
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando oficinas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Oficinas</h1>
        {isAdmin && (
          <Button onClick={openCreateForm}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Oficina
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou instrutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="inativas">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Oficinas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOficinas.map((oficina) => (
          <Card key={oficina.id} className="h-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{oficina.nome}</CardTitle>
                <Badge variant={oficina.ativa ? "default" : "secondary"}>
                  {oficina.ativa ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{oficina.descricao}</p>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Instrutor: {oficina.instrutor}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {formatDisplayDate(oficina.data_inicio)}
                    {oficina.data_fim && ` - ${formatDisplayDate(oficina.data_fim)}`}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{oficina.horario_inicio} - {oficina.horario_fim}</span>
                </div>

                {oficina.local && (
                  <div className="flex items-center text-sm">
                    <span>📍 {oficina.local}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span>Vagas: {oficina.vagas_ocupadas || 0}/{oficina.vagas_totais}</span>
                  <Badge variant="outline">
                    {Math.round(((oficina.vagas_ocupadas || 0) / oficina.vagas_totais) * 100)}% ocupado
                  </Badge>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(oficina)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(oficina.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOficinas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma oficina encontrada.</p>
        </div>
      )}

      {/* Modal de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOficina ? 'Editar Oficina' : 'Nova Oficina'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="instrutor">Instrutor *</Label>
                <Input
                  id="instrutor"
                  value={formData.instrutor}
                  onChange={(e) => setFormData({...formData, instrutor: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="data_fim">Data de Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horario_inicio">Horário de Início *</Label>
                <Input
                  id="horario_inicio"
                  type="time"
                  value={formData.horario_inicio}
                  onChange={(e) => setFormData({...formData, horario_inicio: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="horario_fim">Horário de Fim *</Label>
                <Input
                  id="horario_fim"
                  type="time"
                  value={formData.horario_fim}
                  onChange={(e) => setFormData({...formData, horario_fim: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  value={formData.local}
                  onChange={(e) => setFormData({...formData, local: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="vagas_totais">Vagas Totais *</Label>
                <Input
                  id="vagas_totais"
                  type="number"
                  min="1"
                  value={formData.vagas_totais}
                  onChange={(e) => setFormData({...formData, vagas_totais: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativa"
                checked={formData.ativa}
                onChange={(e) => setFormData({...formData, ativa: e.target.checked})}
              />
              <Label htmlFor="ativa">Oficina ativa</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedOficina ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Oficinas;
