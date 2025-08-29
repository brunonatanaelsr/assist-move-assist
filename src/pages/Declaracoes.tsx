import { Plus, FileText, Trash2, Download } from "lucide-react";
import { useAuth } from '@/hooks/usePostgreSQLAuth';
import { Profile } from '@/types/profile';
import apiService, { ApiResponse } from '@/services/apiService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Declaracao {
  id: number;
  beneficiaria_id: number;
  beneficiaria_nome: string;
  tipo: string;
  conteudo: string;
  data_emissao: string;
  assinado_por: string;
}

export default function Declaracoes() {
  const { toast } = useToast();
  const { isAdmin, profile } = useAuth();
  const [declaracoes, setDeclaracoes] = useState<Declaracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [beneficiariaId, setBeneficiariaId] = useState("");
  const [novaDeclaracao, setNovaDeclaracao] = useState({
    tipo: "",
    conteudo: "",
  });

  // Carregar declarações
  const carregarDeclaracoes = async () => {
    try {
      setLoading(true);
      const params = beneficiariaId ? `?beneficiaria_id=${beneficiariaId}` : "";
      const response = await apiService.get<Declaracao[]>(`/declaracoes${params}`);
      setDeclaracoes(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar declarações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDeclaracoes();
  }, [beneficiariaId]);

  // Emitir declaração
  const handleEmitir = async () => {
    if (!beneficiariaId || !novaDeclaracao.tipo || !novaDeclaracao.conteudo) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.post("/declaracoes", {
        beneficiaria_id: Number(beneficiariaId),
        ...novaDeclaracao,
        assinado_por: (profile as any)?.name || 'Usuário',
      });

      toast({
        title: "Sucesso",
        description: "Declaração emitida com sucesso",
      });

      setNovaDeclaracao({ tipo: "", conteudo: "" });
      carregarDeclaracoes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao emitir declaração",
        variant: "destructive",
      });
    }
  };

  // Excluir declaração
  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta declaração?')) {
      return;
    }

    try {
      await apiService.delete(`/declaracoes/${id}`);
      toast({
        title: "Sucesso",
        description: "Declaração excluída com sucesso",
      });
      carregarDeclaracoes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir declaração",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p>Carregando declarações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Declarações</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Emitir Nova Declaração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="ID da Beneficiária"
                value={beneficiariaId}
                onChange={(e) => setBeneficiariaId(e.target.value)}
                type="number"
              />
              <Select
                value={novaDeclaracao.tipo}
                onValueChange={(value) =>
                  setNovaDeclaracao({ ...novaDeclaracao, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo da Declaração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPACAO">Declaração de Participação</SelectItem>
                  <SelectItem value="CONCLUSAO">Declaração de Conclusão</SelectItem>
                  <SelectItem value="FREQUENCIA">Declaração de Frequência</SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
              <div className="col-span-2">
                <textarea
                  className="w-full min-h-[100px] p-2 rounded-md border border-gray-300 focus:border-blue-500 focus:outline-none resize-vertical"
                  placeholder="Conteúdo da Declaração"
                  value={novaDeclaracao.conteudo}
                  onChange={(e) =>
                    setNovaDeclaracao({ ...novaDeclaracao, conteudo: e.target.value })
                  }
                />
              </div>
            </div>
            <Button onClick={handleEmitir} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Emitir Declaração
            </Button>
          </CardContent>
        </Card>
      )}

      {declaracoes.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Nenhuma declaração encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {declaracoes.map((dec) => (
            <Card key={dec.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    {dec.tipo}
                  </span>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dec.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Beneficiária: {dec.beneficiaria_nome}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Emitida em: {format(new Date(dec.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Assinado por: {dec.assinado_por}
                </p>
                <p className="text-sm mb-4 p-2 bg-muted rounded-md whitespace-pre-wrap">
                  {dec.conteudo}
                </p>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
