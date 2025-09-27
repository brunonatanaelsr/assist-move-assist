import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type Row = {
  id: number;
  tipo: string;
  beneficiaria_id: number;
  created_at?: string;
  created_by?: number;
  status?: string;
  dados?: any;
};

const tiposDisponiveis = [
  'anamnese', 'ficha_evolucao', 'termos_consentimento', 'visao_holistica',
  'roda_vida', 'plano_acao', 'triagem_inicial', 'avaliacao_risco', 'acompanhamento_mensal', 'avaliacao_final'
];

export default function FormulariosBeneficiaria() {
  const { id } = useParams<{ id: string }>();
  const beneficiariaId = Number(id);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const { hasPermission, loading: authLoading } = useAuth();
  const canViewFormularios = hasPermission('formularios.ler');

  const load = async () => {
    if (!beneficiariaId || !canViewFormularios) return;
    try {
      setLoading(true);
      const resp = await apiService.listFormulariosBeneficiaria(beneficiariaId);
      if (resp.success && resp.data) {
        setRows(resp.data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (canViewFormularios) { void load(); } }, [beneficiariaId, canViewFormularios]);

  const filtered = useMemo(() => {
    let r = [...rows];
    if (tipo !== 'todos') r = r.filter(x => x.tipo === tipo);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(x => JSON.stringify(x.dados || {}).toLowerCase().includes(s));
    }
    return r;
  }, [rows, tipo, search]);

  const exportPdf = async (row: Row) => {
    try {
      const blob = await apiService.exportFormularioPdf(row.tipo, row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form_${row.tipo}_${row.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // noop
    }
  };

  const openForm = (row: Row) => {
    switch (row.tipo) {
      case 'anamnese':
        location.hash = `#/beneficiarias/${beneficiariaId}/formularios/anamnese-social`;
        break;
      case 'ficha_evolucao':
        location.hash = `#/beneficiarias/${beneficiariaId}/formularios/ficha-evolucao`;
        break;
      case 'termos_consentimento':
        location.hash = `#/beneficiarias/${beneficiariaId}/formularios/termos-consentimento`;
        break;
      case 'visao_holistica':
        location.hash = `#/beneficiarias/${beneficiariaId}/formularios/visao-holistica`;
        break;
      case 'roda_vida':
      case 'plano_acao':
      default:
        location.hash = `#/formularios/${row.tipo}`;
        break;
    }
  };

  if (authLoading && !canViewFormularios) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canViewFormularios) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Permissão necessária</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você não possui autorização para visualizar os formulários desta beneficiária. Solicite o acesso <span className="font-medium">formularios.ler</span> à equipe responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Formulários da Beneficiária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposDisponiveis.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input placeholder="Buscar no conteúdo" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <div className="flex-1" />
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
            {canViewFormularios && (
              <Button asChild>
                <Link to={`/beneficiarias/${beneficiariaId}/formularios/evolucao`}>Ver evolução</Link>
              </Button>
            )}
          </div>

          <div className="grid gap-2">
            {filtered.map(row => (
              <div key={`${row.tipo}-${row.id}`} className="flex items-center justify-between border rounded p-3">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</div>
                  <div className="font-medium">{row.tipo}</div>
                  <div className="text-xs text-muted-foreground">ID: {row.id} • Beneficiária: {row.beneficiaria_id}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(row)} disabled={!canViewFormularios}>
                    Abrir
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportPdf(row)} disabled={!canViewFormularios}>
                    Exportar PDF
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-6 text-sm">Nenhum formulário encontrado</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
