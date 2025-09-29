import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowLeft, Save, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formulariosApi } from "@/services/apiService";

const formularioTitles: { [key: string]: string } = {
  "declaracao": "Declaração de Comparecimento",
  "recibo": "Recibo de Benefício", 
  "anamnese": "Anamnese Social",
  "evolucao": "Ficha de Evolução",
  "termo": "Termo de Consentimento",
  "visao": "Visão Holística",
  "roda-vida": "Roda da Vida",
  "plano": "Plano de Ação",
  "matricula": "Matrícula de Projetos"
};

export default function FormularioGenerico() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const query = new URLSearchParams(useLocation().search);
  const beneficiariaId = Number(query.get('beneficiaria_id') || '') || undefined;
  const titulo = formularioTitles[tipo || ""] || (tipo ? tipo : "Formulário");

  const [status, setStatus] = useState('completo');
  const [observacoes, setObservacoes] = useState('');
  const [dadosText, setDadosText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: number } | null>(null);
  const toObj = () => { try { return JSON.parse(dadosText || '{}'); } catch { return {}; } };
  const setObj = (obj: any) => setDadosText(JSON.stringify(obj, null, 2));

  useEffect(() => {
    if (!dadosText || dadosText === '{}') {
      const base: any = { resumo: '', itens: [] };
      if (tipo === 'triagem_inicial') base.resumo = 'Triagem inicial';
      if (tipo === 'avaliacao_risco') base.resumo = 'Avaliação de risco';
      if (tipo === 'acompanhamento_mensal') base.mes_referencia = new Date().toISOString().slice(0,7);
      if (tipo === 'avaliacao_final') base.resumo = 'Avaliação final';
      setDadosText(JSON.stringify(base, null, 2));
    }
  }, [tipo]);

  const handleSave = async () => {
    try {
      if (!tipo) return;
      if (!beneficiariaId) {
        toast({ title: 'Informe a beneficiária', description: 'Use ?beneficiaria_id=ID na URL', variant: 'destructive' });
        return;
      }
      setSaving(true);
      let dados: any = {};
      try { dados = JSON.parse(dadosText); } catch { throw new Error('JSON inválido em dados'); }
      const resp = await formulariosApi.createFormulario(tipo, { beneficiaria_id: beneficiariaId, dados, status, observacoes });
      if (resp.success && resp.data) {
        setCreated({ id: resp.data.id });
        toast({ title: 'Salvo', description: `Formulário ${tipo} criado` });
      } else {
        throw new Error(resp.message || 'Falha ao salvar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!created?.id || !tipo) return;
    const blob = await formulariosApi.exportFormularioPdf(tipo, created.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `form_${tipo}_${created.id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link to={beneficiariaId ? `/beneficiarias/${beneficiariaId}/formularios` : '/beneficiarias'}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{titulo}</h1>
          <p className="text-muted-foreground">Preencha e salve os dados do formulário</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> {titulo}
          </CardTitle>
          <CardDescription>Beneficiária: {beneficiariaId || '—'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Completo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm mb-1 block">Observações</label>
              <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações gerais" />
            </div>
          </div>

          {/* Campos guiados por tipo */}
          {tipo && (
            <div className="space-y-3 border rounded p-3">
              <div className="text-sm font-semibold">Campos do tipo: {tipo}</div>
              {tipo === 'triagem_inicial' && (
                <>
                  <label className="text-sm mb-1 block">Resumo</label>
                  <Input value={(toObj().resumo||'')} onChange={e=>{ const o=toObj(); o.resumo=e.target.value; setObj(o); }} />
                  <label className="text-sm mb-1 block">Prioridade</label>
                  <Select value={(toObj().prioridade||'normal')} onValueChange={v=>{ const o=toObj(); o.prioridade=v; setObj(o); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {tipo === 'avaliacao_risco' && (
                <>
                  <label className="text-sm mb-1 block">Nível de risco</label>
                  <Select value={(toObj().nivel||'medio')} onValueChange={v=>{ const o=toObj(); o.nivel=v; setObj(o); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="text-sm mb-1 block">Observações</label>
                  <Textarea rows={4} value={(toObj().observacoes||'')} onChange={e=>{ const o=toObj(); o.observacoes=e.target.value; setObj(o); }} />
                </>
              )}
              {tipo === 'acompanhamento_mensal' && (
                <>
                  <label className="text-sm mb-1 block">Mês de referência (YYYY-MM)</label>
                  <Input value={(toObj().mes_referencia||'')} onChange={e=>{ const o=toObj(); o.mes_referencia=e.target.value; setObj(o); }} />
                  <label className="text-sm mb-1 block">Evolução</label>
                  <Textarea rows={4} value={(toObj().evolucao||'')} onChange={e=>{ const o=toObj(); o.evolucao=e.target.value; setObj(o); }} />
                </>
              )}
              {tipo === 'avaliacao_final' && (
                <>
                  <label className="text-sm mb-1 block">Resultado</label>
                  <Textarea rows={4} value={(toObj().resultado||'')} onChange={e=>{ const o=toObj(); o.resultado=e.target.value; setObj(o); }} />
                  <label className="text-sm mb-1 block">Próximos passos</label>
                  <Textarea rows={3} value={(toObj().proximos_passos||'')} onChange={e=>{ const o=toObj(); o.proximos_passos=e.target.value; setObj(o); }} />
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-sm mb-1 block">Dados (JSON)</label>
            <Textarea rows={16} value={dadosText} onChange={e => setDadosText(e.target.value)} className="font-mono" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}</Button>
            <Button variant="outline" onClick={() => beneficiariaId && navigate(`/beneficiarias/${beneficiariaId}/formularios`)}>Cancelar</Button>
            <Button variant="outline" onClick={handleExport} disabled={!created}><Download className="h-4 w-4 mr-2" /> Exportar PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
