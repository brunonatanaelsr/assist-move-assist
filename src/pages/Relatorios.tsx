import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, FileText, Plus, Trash2 } from "lucide-react";
import { api } from "@/services/api";

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  type: string;
  updated_at: string;
}

export default function Relatorios() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/relatorios/templates`);
      setTemplates(data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTemplate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post(`/relatorios/templates`, {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'DASHBOARD',
        metrics: []
      });
      setName("");
      setDescription("");
      await load();
    } finally {
      setCreating(false);
    }
  };

  const removeTemplate = async (id: number) => {
    if (!confirm('Remover template?')) return;
    await api.delete(`/relatorios/templates/${id}`);
    await load();
  };

  const exportTemplate = async (id: number, format: 'pdf'|'csv'|'xlsx') => {
    const response = await api.post(`/relatorios/export/${id}`, { format }, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${id}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Gere e gerencie templates de relatórios</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Relatório
          </CardTitle>
          <CardDescription>Crie e exporte relatórios em PDF, CSV ou Excel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Relatório Mensal" />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
            </div>
          </div>
          <Button onClick={createTemplate} disabled={creating || !name.trim()}>
            <Plus className="h-4 w-4 mr-2" /> Criar Template
          </Button>

          <div className="mt-6 border rounded-md divide-y">
            {loading && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}
            {!loading && templates.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhum template cadastrado.</div>
            )}
            {templates.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description || 'Sem descrição'} • Atualizado em {new Date(t.updated_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportTemplate(t.id, 'pdf')}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportTemplate(t.id, 'csv')}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportTemplate(t.id, 'xlsx')}>
                    <Download className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => removeTemplate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatório Consolidado (API)
            </CardTitle>
            <CardDescription>KPIs gerais consolidados</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.open('#/relatorios', '_self')}>Ver detalhes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
