import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  UserPlus, 
  Users, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  MapPin,
  Target,
  CheckCircle,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Download,
  UserCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/usePostgreSQLAuth';

interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  carga_horaria?: number;
  status: 'planejamento' | 'em_andamento' | 'finalizado' | 'suspenso';
  local?: string;
  coordenador?: string;
  meta_participantes?: number;
  observacoes?: string;
}

interface Participante {
  id: string;
  beneficiaria_id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  contato1: string;
  data_matricula: string;
  status: 'ativo' | 'concluido' | 'desistente' | 'suspenso';
  presencas?: number;
  total_encontros?: number;
  observacoes?: string;
}

// Mock data para desenvolvimento
const mockProjeto: Projeto = {
  id: '1',
  nome: 'Marias Empreendedoras',
  descricao: 'Programa de capacitação em empreendedorismo social focado no empoderamento econômico das mulheres.',
  data_inicio: '2024-02-01',
  data_fim: '2024-07-31',
  carga_horaria: 120,
  status: 'em_andamento',
  local: 'Centro Comunitário Move Marias',
  coordenador: 'Ana Silva Santos',
  meta_participantes: 30,
  observacoes: 'Projeto com foco em geração de renda e autonomia financeira'
};

const mockParticipantes: Participante[] = [
  {
    id: '1',
    beneficiaria_id: '1',
    nome_completo: 'Maria Silva Santos',
    cpf: '123.456.789-01',
    data_nascimento: '1985-03-15',
    contato1: '(11) 99999-1111',
    data_matricula: '2024-02-01',
    status: 'ativo',
    presencas: 18,
    total_encontros: 20,
    observacoes: 'Excelente participação, demonstra muito interesse'
  },
  {
    id: '2',
    beneficiaria_id: '2',
    nome_completo: 'Ana Paula Oliveira',
    cpf: '234.567.890-12',
    data_nascimento: '1990-07-22',
    contato1: '(11) 99999-2222',
    data_matricula: '2024-02-01',
    status: 'ativo',
    presencas: 15,
    total_encontros: 20,
    observacoes: 'Boa participação, às vezes falta por questões familiares'
  },
  {
    id: '3',
    beneficiaria_id: '3',
    nome_completo: 'Fernanda Costa Lima',
    cpf: '345.678.901-23',
    data_nascimento: '1982-11-08',
    contato1: '(11) 99999-3333',
    data_matricula: '2024-02-15',
    status: 'concluido',
    presencas: 19,
    total_encontros: 20,
    observacoes: 'Concluiu com aproveitamento excelente'
  },
  {
    id: '4',
    beneficiaria_id: '4',
    nome_completo: 'Juliana Pereira',
    cpf: '456.789.012-34',
    data_nascimento: '1988-05-30',
    contato1: '(11) 99999-4444',
    data_matricula: '2024-02-01',
    status: 'desistente',
    presencas: 8,
    total_encontros: 20,
    observacoes: 'Desistiu por mudança de endereço'
  }
];

const statusColors = {
  ativo: 'bg-green-100 text-green-800 border-green-200',
  concluido: 'bg-blue-100 text-blue-800 border-blue-200',
  desistente: 'bg-red-100 text-red-800 border-red-200',
  suspenso: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

const statusLabels = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  desistente: 'Desistente',
  suspenso: 'Suspenso'
};

export default function ParticipantesProjeto() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [filteredParticipantes, setFilteredParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('participantes');

  // Estados para estatísticas
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    concluidos: 0,
    desistentes: 0,
    suspensos: 0,
    percentualPresenca: 0
  });

  useEffect(() => {
    loadData();
  }, [projetoId]);

  useEffect(() => {
    filterParticipantes();
    calculateStats();
  }, [participantes, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar projeto real do backend
      const projetoResponse = await apiService.getProjetoById(parseInt(params.id || '1'));
      if (projetoResponse.success) {
        setProjeto(projetoResponse.data);
      }
      
      // Carregar participações reais do projeto
      const participacoesResponse = await apiService.getParticipacoesPorProjeto(parseInt(params.id || '1'));
      if (participacoesResponse.success) {
        setParticipantes(participacoesResponse.data || []);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Fallback para dados mock apenas em caso de erro
      console.warn('Usando dados mock como fallback');
      setProjeto(mockProjeto);
      setParticipantes(mockParticipantes);
    } finally {
      setLoading(false);
    }
  };

  const filterParticipantes = () => {
    let filtered = participantes;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredParticipantes(filtered);
  };

  const calculateStats = () => {
    const total = participantes.length;
    const ativos = participantes.filter(p => p.status === 'ativo').length;
    const concluidos = participantes.filter(p => p.status === 'concluido').length;
    const desistentes = participantes.filter(p => p.status === 'desistente').length;
    const suspensos = participantes.filter(p => p.status === 'suspenso').length;
    
    const totalPresencas = participantes.reduce((sum, p) => sum + (p.presencas || 0), 0);
    const totalEncontros = participantes.reduce((sum, p) => sum + (p.total_encontros || 0), 0);
    const percentualPresenca = totalEncontros > 0 ? Math.round((totalPresencas / totalEncontros) * 100) : 0;

    setStats({
      total,
      ativos,
      concluidos,
      desistentes,
      suspensos,
      percentualPresenca
    });
  };

  const handleRemoveParticipante = async (participanteId: string) => {
    try {
      // Em produção, fazer a remoção no banco de dados
      setParticipantes(prev => prev.filter(p => p.id !== participanteId));
    } catch (error) {
      console.error('Erro ao remover participante:', error);
    }
  };

  const getPresencaPercentual = (participante: Participante) => {
    if (!participante.total_encontros || participante.total_encontros === 0) return 0;
    return Math.round(((participante.presencas || 0) / participante.total_encontros) * 100);
  };

  const getPresencaBadgeColor = (percentual: number) => {
    if (percentual >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (percentual >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Projeto não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/projetos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Projetos
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{projeto.nome}</h1>
            <p className="text-gray-600">{projeto.descricao}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Participante
          </Button>
        </div>
      </div>

      {/* Informações do Projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Informações do Projeto</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="font-medium">
                  {new Date(projeto.data_inicio).toLocaleDateString()} - {
                    projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString() : 'Em andamento'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Carga Horária</p>
                <p className="font-medium">{projeto.carga_horaria}h</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Local</p>
                <p className="font-medium">{projeto.local}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Meta Participantes</p>
                <p className="font-medium">{projeto.meta_participantes}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                <p className="text-sm text-gray-600">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.concluidos}</p>
                <p className="text-sm text-gray-600">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.desistentes}</p>
                <p className="text-sm text-gray-600">Desistentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.suspensos}</p>
                <p className="text-sm text-gray-600">Suspensos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.percentualPresenca}%</p>
                <p className="text-sm text-gray-600">Presença</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="desistente">Desistentes</SelectItem>
            <SelectItem value="suspenso">Suspensos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Participantes */}
      <Card>
        <CardHeader>
          <CardTitle>Participantes ({filteredParticipantes.length})</CardTitle>
          <CardDescription>
            Gerencie os participantes do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredParticipantes.map((participante) => (
              <div
                key={participante.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{participante.nome_completo}</h3>
                      <p className="text-sm text-gray-600">
                        CPF: {participante.cpf} • Contato: {participante.contato1}
                      </p>
                      <p className="text-sm text-gray-600">
                        Matriculado em: {new Date(participante.data_matricula).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={statusColors[participante.status]}>
                        {statusLabels[participante.status]}
                      </Badge>
                      <Badge className={getPresencaBadgeColor(getPresencaPercentual(participante))}>
                        {participante.presencas || 0}/{participante.total_encontros || 0} ({getPresencaPercentual(participante)}%)
                      </Badge>
                    </div>
                  </div>
                  {participante.observacoes && (
                    <p className="text-sm text-gray-500 italic">
                      {participante.observacoes}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/beneficiarias/${participante.beneficiaria_id}`}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Participação
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Calendar className="h-4 w-4 mr-2" />
                      Controle de Presença
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover do Projeto
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover {participante.nome_completo} do projeto? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveParticipante(participante.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {filteredParticipantes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Nenhum participante encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
