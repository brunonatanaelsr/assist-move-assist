import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

const statusDisponiveis = ['completo', 'pendente', 'rascunho', 'arquivado'];

export default function FormulariosBeneficiaria() {
  const { id } = useParams<{ id: string }>();
  const beneficiariaId = Number(id);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const load = async () => {
    if (!beneficiariaId) return;
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

  useEffect(() => { load(); }, [beneficiariaId]);

  const filtered = useMemo(() => {
    let r = [...rows];
    if (tipo !== 'todos') r = r.filter(x => x.tipo === tipo);
    if (status !== 'todos') r = r.filter(x => (x.status || '').toLowerCase() === status.toLowerCase());
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      r = r.filter(x => (x.created_at ? new Date(x.created_at) >= inicio : true));
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      r = r.filter(x => (x.created_at ? new Date(x.created_at) <= fim : true));
    }
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(x => {
        const base = JSON.stringify(x.dados || {}).toLowerCase();
        const obs = (x as any).observacoes?.toLowerCase?.() || '';
        return base.includes(s) || obs.includes(s) || String(x.id).includes(search);
      });
    }
    return r;
  }, [rows, tipo, status, dataInicio, dataFim, search]);

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
      case 'plano_acao':
        location.hash = `#/beneficiarias/${beneficiariaId}/formularios/plano-acao?formId=${row.id}`;
        break;
      case 'roda_vida':
        location.hash = `#/formularios/roda_vida`;
        break;
      default:
        location.hash = `#/formularios/${row.tipo}`;
        break;
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Formulários da Beneficiária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposDisponiveis.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusDisponiveis.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            <Input placeholder="Buscar em observações ou conteúdo" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <div className="flex-1" />
            <Button variant="outline" onClick={load} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</Button>
            <Button asChild variant="secondary">
              <Link to={`/beneficiarias/${beneficiariaId}/formularios/evolucao`}>Ver evolução</Link>
            </Button>
            <Button onClick={() => navigate(`/beneficiarias/${beneficiariaId}/formularios/plano-acao`)}>
              Novo PAEDI
            </Button>
          </div>

          <div className="grid gap-2">
            {filtered.map(row => (
              <div key={`${row.tipo}-${row.id}`} className="flex items-center justify-between border rounded p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                    {row.status && <Badge variant="outline" className="uppercase text-xs">{row.status}</Badge>}
                  </div>
                  <div className="font-medium capitalize">{row.tipo.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">ID: {row.id} • Beneficiária: {row.beneficiaria_id}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(row)}>Abrir</Button>
                  <Button variant="outline" size="sm" onClick={() => exportPdf(row)}>Exportar PDF</Button>
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
