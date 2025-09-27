import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { formatDate } from '@/lib/dayjs';
import { apiService } from '@/services/apiService';
import { oficinasService } from '@/services/oficinas.service';
import { Download } from 'lucide-react';
import { useCreateOficina, useDeleteOficina, useOficinas, useOficinaResumo, useUpdateOficina } from '@/hooks/useOficinas';
import {
  formatDateForInput,
  getOficinaStatusMetadata,
  getVagasDisponiveis,
  initialOficinaFormValues,
  mapOficinaToFormValues,
  normalizeResumoDate,
  resumoIndicators,
  validateAndNormalizeOficina,
} from '@/utils/oficinas';
import type { Oficina, OficinaFormValues } from '@/types/oficinas';

interface Projeto {
  id: number;
  nome: string;
  descricao?: string;
  status: string;
}

export default function OficinasNew() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState<Oficina | null>(null);
  const [formValues, setFormValues] = useState<OficinaFormValues>(initialOficinaFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const oficinasQuery = useOficinas();
  const oficinasResponse = oficinasQuery.data;
  const oficinas = useMemo<Oficina[]>(() => {
    if (!oficinasResponse || oficinasResponse.success === false) return [];
    return Array.isArray(oficinasResponse.data) ? oficinasResponse.data : [];
  }, [oficinasResponse]);

  const createOficina = useCreateOficina();
  const updateOficina = useUpdateOficina(editingOficina?.id ?? 0);
  const deleteOficina = useDeleteOficina();

  const projetosQuery = useQuery({
    queryKey: ['projetos', 'ativos'],
    queryFn: () => apiService.getProjetos(),
  });

  const projetos = useMemo<Projeto[]>(() => {
    if (!projetosQuery.data?.success) return [];
    return (projetosQuery.data.data ?? []).filter((p: Projeto) =>
      p.status === 'planejamento' || p.status === 'em_andamento'
    );
  }, [projetosQuery.data]);

  const isLoading = oficinasQuery.isLoading;
  const isRefetching = oficinasQuery.isRefetching;
  const showLoading = isLoading || isRefetching;
  const backendListError = oficinasResponse && oficinasResponse.success === false ? oficinasResponse.message : undefined;
  const listError = oficinasQuery.isError
    ? (oficinasQuery.error as Error | undefined)
    : backendListError
    ? new Error(backendListError)
    : undefined;
  const isSubmitting = createOficina.isPending || updateOficina.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const validation = validateAndNormalizeOficina(formValues);
    if (!validation.success) {
      setFormError(validation.message);
      return;
    }

    const payload = validation.payload;

    try {
      if (editingOficina) {
        await updateOficina.mutateAsync(payload);
        setSuccess('Oficina atualizada com sucesso!');
      } else {
        await createOficina.mutateAsync(payload);
        setSuccess('Oficina criada com sucesso!');
      }

      setDialogOpen(false);
      setEditingOficina(null);
      setFormValues(initialOficinaFormValues);
    } catch (mutationError: any) {
      const message = mutationError?.message || 'Erro ao salvar oficina';
      setFormError(message);
    }
  };

  const handleEdit = (oficina: Oficina) => {
    setEditingOficina(oficina);
    setFormValues(mapOficinaToFormValues(oficina));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta oficina?')) return;

    setSuccess(null);
    setFormError(null);

    deleteOficina.mutate(id, {
      onSuccess: () => {
        setSuccess('Oficina excluída com sucesso!');
      },
      onError: (mutationError: any) => {
        setFormError(mutationError?.message || 'Erro ao excluir oficina');
      },
    });
  };

  const resetForm = () => {
    setFormValues(initialOficinaFormValues);
    setEditingOficina(null);
    setFormError(null);
  };

  const baixarRelatorio = async (oficinaId: number, formato: 'pdf' | 'excel' = 'pdf') => {
    try {
      const data = await oficinasService.gerarRelatorioPresencas(oficinaId, formato);
      const blob = new Blob([data], { type: formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_presencas_oficina_${oficinaId}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar relatório de presenças:', error);
      setFormError('Erro ao gerar relatório de presenças');
    }
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
            
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="nome">Nome da Oficina *</Label>
                  <Input
                    id="nome"
                    value={formValues.nome}
                    onChange={(e) => setFormValues({ ...formValues, nome: e.target.value })}
                    placeholder="Ex: Curso de Informática Básica"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formValues.descricao}
                    onChange={(e) => setFormValues({ ...formValues, descricao: e.target.value })}
                    placeholder="Descreva o conteúdo e objetivos da oficina"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instrutor">Instrutor</Label>
                    <Input
                      id="instrutor"
                      value={formValues.instrutor}
                      onChange={(e) => setFormValues({ ...formValues, instrutor: e.target.value })}
                      placeholder="Nome do instrutor"
                    />
                  </div>

                  <div>
                    <Label htmlFor="projeto_id">Projeto Associado</Label>
                    <Select value={formValues.projeto_id} onValueChange={(value) => setFormValues({ ...formValues, projeto_id: value })}>
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
                      value={formValues.data_inicio}
                      onChange={(e) => setFormValues({ ...formValues, data_inicio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_fim">Data de Fim</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formValues.data_fim}
                      onChange={(e) => setFormValues({ ...formValues, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="horario_inicio">Horário de Início *</Label>
                    <Input
                      id="horario_inicio"
                      type="time"
                      value={formValues.horario_inicio}
                      onChange={(e) => setFormValues({ ...formValues, horario_inicio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="horario_fim">Horário de Fim *</Label>
                    <Input
                      id="horario_fim"
                      type="time"
                      value={formValues.horario_fim}
                      onChange={(e) => setFormValues({ ...formValues, horario_fim: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="local">Local</Label>
                    <Input
                      id="local"
                      value={formValues.local}
                      onChange={(e) => setFormValues({ ...formValues, local: e.target.value })}
                      placeholder="Ex: Sala 1, Laboratório, Online"
                    />
                  </div>

                  <div>
                  <Label htmlFor="vagas_total">Vagas Totais *</Label>
                    <Input
                      id="vagas_total"
                      type="number"
                      min="1"
                      value={formValues.vagas_total}
                      onChange={(e) => setFormValues({ ...formValues, vagas_total: Number(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dias_semana">Dias da Semana</Label>
                  <Input
                    id="dias_semana"
                    value={formValues.dias_semana}
                    onChange={(e) => setFormValues({ ...formValues, dias_semana: e.target.value })}
                    placeholder="Ex: Segunda, Quarta e Sexta"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status da Oficina</Label>
                  <Select value={formValues.status} onValueChange={(value: any) => setFormValues({ ...formValues, status: value as Oficina['status'] })}>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : (editingOficina ? 'Salvar Alterações' : 'Criar Oficina')}
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

      {listError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50" data-testid="oficinas-error">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {listError.message || 'Erro ao carregar oficinas'}
          </AlertDescription>
        </Alert>
      )}

      {showLoading ? (
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
          {oficinas.map((oficina) => {
            const statusMeta = getOficinaStatusMetadata(
              oficina.status,
              oficina.vagas_total,
              oficina.vagas_ocupadas
            );
            const vagasDisponiveis = getVagasDisponiveis(oficina.vagas_total, oficina.vagas_ocupadas);

            return (
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
                        onClick={() => baixarRelatorio(oficina.id, 'pdf')}
                        title="Baixar relatório de presenças (PDF)"
                      >
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => baixarRelatorio(oficina.id, 'excel')}
                        title="Baixar relatório de presenças (Excel)"
                      >
                        <Download className="h-4 w-4" /> XLSX
                      </Button>
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
                    <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {oficina.vagas_ocupadas || 0}/{oficina.vagas_total} vagas
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(oficina.data_inicio, 'DD/MM/YYYY')}
                        {oficina.data_fim && (
                          <> até {formatDate(oficina.data_fim, 'DD/MM/YYYY')}</>
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

                  <OficinaResumoIndicators oficinaId={oficina.id} />

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Ocupação</span>
                      <span>{Math.round(((oficina.vagas_ocupadas || 0) / oficina.vagas_total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(((oficina.vagas_ocupadas || 0) / oficina.vagas_total) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vagasDisponiveis} vagas disponíveis
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const OficinaResumoIndicators: React.FC<{ oficinaId: number }> = ({ oficinaId }) => {
  const { data, isLoading, isError } = useOficinaResumo(oficinaId);
  const backendError = data && data.success === false ? data.message : undefined;

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando resumo...</div>;
  }

  if (isError || backendError) {
    return (
      <div className="text-xs text-muted-foreground" data-testid={`oficina-resumo-error-${oficinaId}`}>
        Não foi possível carregar o resumo
      </div>
    );
  }

  const resumo = normalizeResumoDate(data?.data ?? null);
  const indicators = resumoIndicators(resumo);

  if (!resumo || indicators.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {indicators.map(({ label, value }) => (
        <span key={label} className="rounded-md bg-muted px-2 py-1">
          <span className="font-medium text-foreground">{label}:</span> {value}
        </span>
      ))}
    </div>
  );
};
