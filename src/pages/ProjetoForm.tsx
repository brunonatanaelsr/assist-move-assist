import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjeto, useCriarProjeto, useAtualizarProjeto } from '@/hooks/useProjetos';
import { ProjetoInput } from '@/types/projeto';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { ChevronLeft } from 'lucide-react';

// Lista mockada de responsáveis - deve vir da API
const RESPONSAVEIS = [
  { id: 1, nome: 'Ana Silva' },
  { id: 2, nome: 'João Santos' },
  { id: 3, nome: 'Maria Oliveira' },
];

export function ProjetoForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(Number(id));
  const criarProjeto = useCriarProjeto();
  const atualizarProjeto = useAtualizarProjeto(Number(id));

  const [formData, setFormData] = useState<ProjetoInput>({
    nome: '',
    descricao: '',
    objetivo: '',
    data_inicio: '',
    data_fim: '',
    responsavel_id: 0,
    orcamento: 0,
    meta_beneficiarias: 0,
  });

  // Preenche o formulário com os dados do projeto quando estiver editando
  useState(() => {
    if (projeto) {
      setFormData({
        nome: projeto.nome,
        descricao: projeto.descricao || '',
        objetivo: projeto.objetivo,
        data_inicio: projeto.data_inicio,
        data_fim: projeto.data_fim || '',
        responsavel_id: projeto.responsavel_id,
        orcamento: projeto.orcamento || 0,
        meta_beneficiarias: projeto.meta_beneficiarias || 0,
      });
    }
  }, [projeto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      await atualizarProjeto.mutateAsync(formData);
    } else {
      await criarProjeto.mutateAsync(formData);
    }
    
    navigate('/projetos');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isEditing && loadingProjeto) {
    return <Loading message="Carregando dados do projeto..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/projetos')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Projeto' : 'Novo Projeto'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Projeto</CardTitle>
            <CardDescription>
              Preencha os dados básicos do projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Projeto</Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel_id">Responsável</Label>
                <Select
                  name="responsavel_id"
                  value={formData.responsavel_id.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      responsavel_id: Number(value),
                    }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSAVEIS.map((responsavel) => (
                      <SelectItem
                        key={responsavel.id}
                        value={responsavel.id.toString()}
                      >
                        {responsavel.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  name="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término (opcional)</Label>
                <Input
                  id="data_fim"
                  name="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orcamento">Orçamento (R$)</Label>
                <Input
                  id="orcamento"
                  name="orcamento"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.orcamento}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_beneficiarias">
                  Meta de Beneficiárias
                </Label>
                <Input
                  id="meta_beneficiarias"
                  name="meta_beneficiarias"
                  type="number"
                  min="0"
                  value={formData.meta_beneficiarias}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Textarea
                id="objetivo"
                name="objetivo"
                value={formData.objetivo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição Detalhada</Label>
              <Textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/projetos')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={criarProjeto.isPending || atualizarProjeto.isPending}
            >
              {criarProjeto.isPending || atualizarProjeto.isPending ? (
                'Salvando...'
              ) : isEditing ? (
                'Atualizar Projeto'
              ) : (
                'Criar Projeto'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
