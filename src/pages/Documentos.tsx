import { Plus, FileText, Trash2, Download } from "lucide-react";
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
import { apiService } from "@/services/apiService";
import { useAuth } from "@/hooks/usePostgreSQLAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Documento {
  id: number;
  beneficiaria_id: number;
  beneficiaria_nome: string;
  tipo: string;
  nome: string;
  url: string;
  data_upload: string;
}

export default function Documentos() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [beneficiariaId, setBeneficiariaId] = useState("");
  const [novoDocumento, setNovoDocumento] = useState({
    tipo: "",
    nome: "",
    url: "",
  });

  // Carregar documentos
  const carregarDocumentos = async () => {
    try {
      setLoading(true);
      const params = beneficiariaId ? `?beneficiaria_id=${beneficiariaId}` : "";
      const response = await apiService.get(`/documentos${params}`);
      setDocumentos(response.data.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, [beneficiariaId]);

  // Upload de documento
  const handleUpload = async () => {
    if (!beneficiariaId || !novoDocumento.tipo || !novoDocumento.nome) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.post("/documentos", {
        beneficiaria_id: Number(beneficiariaId),
        ...novoDocumento,
      });

      toast({
        title: "Sucesso",
        description: "Documento adicionado com sucesso",
      });

      setNovoDocumento({ tipo: "", nome: "", url: "" });
      carregarDocumentos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar documento",
        variant: "destructive",
      });
    }
  };

  // Excluir documento
  const handleDelete = async (id: number) => {
    try {
      await apiService.delete(`/documentos/${id}`);
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso",
      });
      carregarDocumentos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir documento",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Documentos</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Novo Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="ID da Beneficiária"
                value={beneficiariaId}
                onChange={(e) => setBeneficiariaId(e.target.value)}
              />
              <Select
                value={novoDocumento.tipo}
                onValueChange={(value) =>
                  setNovoDocumento({ ...novoDocumento, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo do Documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RG">RG</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="COMPROVANTE_RESIDENCIA">
                    Comprovante de Residência
                  </SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome do Documento"
                value={novoDocumento.nome}
                onChange={(e) =>
                  setNovoDocumento({ ...novoDocumento, nome: e.target.value })
                }
              />
              <Input
                placeholder="URL do Documento"
                value={novoDocumento.url}
                onChange={(e) =>
                  setNovoDocumento({ ...novoDocumento, url: e.target.value })
                }
              />
            </div>
            <Button onClick={handleUpload} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documento
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentos.map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {doc.nome}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Beneficiária: {doc.beneficiaria_nome}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Tipo: {doc.tipo}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload: {format(new Date(doc.data_upload), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
              {doc.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
