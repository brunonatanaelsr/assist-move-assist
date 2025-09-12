import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, MoreHorizontal, Edit, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiService } from "@/services/apiService";

// Tipo correto baseado no banco real
interface Beneficiaria {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  telefone?: string;
  contato1?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  escolaridade?: string;
  profissao?: string;
  estado_civil?: string;
  tem_filhos?: boolean;
  quantidade_filhos?: number;
  renda_familiar?: number;
  situacao_vulnerabilidade?: string;
  observacoes?: string;
  status?: string;
  data_criacao: string;
  data_atualizacao: string;
  ativo: boolean;
}

export default function BeneficiariasFixed() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);
  const [programaFilter, setProgramaFilter] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [beneficiarias, setBeneficiarias] = useState<Beneficiaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    aguardando: 0,
    inativas: 0
  });

  // Função para obter status da beneficiária baseado nos dados reais
  const getBeneficiariaStatus = (beneficiaria: Beneficiaria) => {
    // Usar status do banco ou calcular baseado no campo ativo
    if (beneficiaria.status) {
      return beneficiaria.status === 'ativa' ? 'Ativa' : 
             beneficiaria.status === 'inativa' ? 'Inativa' : 'Aguardando';
    }
    
    // Fallback: usar campo ativo
    return beneficiaria.ativo ? 'Ativa' : 'Inativa';
  };

  useEffect(() => {
    loadBeneficiarias();
  }, []);

  const loadBeneficiarias = async () => {
    try {
      setLoading(true);
      
      // Usar apiService consistente
      const response = await apiService.getBeneficiarias();
      console.log('Resposta API beneficiárias:', response);
      
      if (response.success && response.data) {
        const data = response.data;
        setBeneficiarias(data);
        
        // Calculate stats com status real do banco
        const total = data.length;
        const ativas = data.filter(b => getBeneficiariaStatus(b) === 'Ativa').length;
        const inativas = data.filter(b => getBeneficiariaStatus(b) === 'Inativa').length;
        const aguardando = data.filter(b => getBeneficiariaStatus(b) === 'Aguardando').length;
        
        setStats({
          total,
          ativas,
          aguardando,
          inativas
        });
      } else {
        console.error('Erro na resposta:', response);
        setBeneficiarias([]);
        setStats({ total: 0, ativas: 0, aguardando: 0, inativas: 0 });
      }
    } catch (error) {
      console.error('Erro ao carregar beneficiárias:', error);
      setBeneficiarias([]);
      setStats({ total: 0, ativas: 0, aguardando: 0, inativas: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filteredBeneficiarias = beneficiarias.filter(beneficiaria => {
    const matchesSearch = beneficiaria.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (beneficiaria.cpf && beneficiaria.cpf.includes(searchTerm));
    
    const beneficiariaStatus = getBeneficiariaStatus(beneficiaria);
    const matchesStatus = selectedStatus === "Todas" || selectedStatus === beneficiariaStatus;
    
    // Como não temos campo programa_servico, vamos usar sempre true para programaFilter
    const matchesPrograma = programaFilter === "Todos";
    
    return matchesSearch && matchesStatus && matchesPrograma;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBeneficiarias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBeneficiarias = filteredBeneficiarias.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, programaFilter]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Ativa": return "default";
      case "Aguardando": return "secondary";
      case "Inativa": return "outline";
      default: return "default";
    }
  };

  const getInitials = (nome?: string | null) => {
    if (!nome) return 'UN';
    
    return nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatCpf = (cpf: string) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const generatePaedi = (beneficiaria: Beneficiaria) => {
    try {
      const dataCadastro = beneficiaria.data_criacao ? new Date(beneficiaria.data_criacao) : new Date();
      const year = isNaN(dataCadastro.getTime()) ? new Date().getFullYear() : dataCadastro.getFullYear();
      const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
      return `MM-${year}-${sequence}`;
    } catch (error) {
      console.warn('Erro ao gerar PAEDI:', error);
      const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
      return `MM-${new Date().getFullYear()}-${sequence}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Beneficiárias</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro das beneficiárias do instituto
          </p>
        </div>
        <Button className="w-fit" size="lg" onClick={() => navigate('/beneficiarias/nova')} data-testid="cadastrar-beneficiaria">
          <Plus className="h-4 w-4 mr-2" />
          Nova Beneficiária
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{loading ? "..." : stats.total}</div>
            <p className="text-sm text-muted-foreground">Total de Beneficiárias</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{loading ? "..." : stats.ativas}</div>
            <p className="text-sm text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{loading ? "..." : stats.aguardando}</div>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{loading ? "..." : stats.inativas}</div>
            <p className="text-sm text-muted-foreground">Inativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Lista de Beneficiárias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou PAEDI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                onClick={() => setSearchTerm(searchTerm)}
                data-testid="search-button"
              >
                Buscar
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="Todas">Todas</option>
                      <option value="Ativa">Ativa</option>
                      <option value="Aguardando">Aguardando</option>
                      <option value="Inativa">Inativa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Programa/Serviço</label>
                    <select
                      value={programaFilter}
                      onChange={(e) => setProgramaFilter(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Assistência Social">Assistência Social</option>
                      <option value="Educação Profissional">Educação Profissional</option>
                      <option value="Capacitação Técnica">Capacitação Técnica</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedStatus("Todas");
                        setProgramaFilter("Todos");
                        setSearchTerm("");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <div className="rounded-md border border-border overflow-hidden" data-testid="beneficiaria-lista">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Beneficiária</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>PAEDI</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Nascimento</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">Carregando beneficiárias...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredBeneficiarias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Nenhuma beneficiária encontrada para sua busca.' : 'Nenhuma beneficiária cadastrada ainda.'}
                      </p>
                      {!searchTerm && (
                        <Button className="mt-4" onClick={() => navigate('/beneficiarias/nova')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Cadastrar primeira beneficiária
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBeneficiarias.map((beneficiaria) => (
                    <TableRow key={beneficiaria.id} className="hover:bg-muted/30" data-testid="beneficiaria-item">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(beneficiaria.nome_completo)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{beneficiaria.nome_completo}</div>
                            <div className="text-sm text-muted-foreground">{beneficiaria.email || 'Sem email'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatCpf(beneficiaria.cpf || '')}</TableCell>
                      <TableCell className="font-mono text-sm font-medium text-primary">
                        {generatePaedi(beneficiaria)}
                      </TableCell>
                      <TableCell>{beneficiaria.telefone || beneficiaria.contato1 || 'Não informado'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(getBeneficiariaStatus(beneficiaria))}>
                          {getBeneficiariaStatus(beneficiaria)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(beneficiaria.data_nascimento)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver PAEDI
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}/editar`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/beneficiarias/${beneficiaria.id}/formularios/declaracoes-recibos`)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Gerar Documento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredBeneficiarias.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredBeneficiarias.length)} de {filteredBeneficiarias.length} beneficiárias
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
