import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/apiService";
import { ReactNode } from "react";

// Componente StatCard local
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
}

const StatCard = ({ title, value, description, icon, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "border-border",
    primary: "border-blue-200 bg-blue-50",
    success: "border-green-200 bg-green-50", 
    warning: "border-yellow-200 bg-yellow-50"
  };

  return (
    <Card className={`${variantStyles[variant]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon && <div>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardNew() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBeneficiarias: 0,
    formularios: 0,
    atendimentosMes: 0,
    engajamento: "0%"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await apiService.getBeneficiarias();
        const beneficiarias = response.data || [];
        setStats({
          totalBeneficiarias: beneficiarias.length,
          formularios: beneficiarias.length * 2, // Mock
          atendimentosMes: Math.floor(beneficiarias.length / 2), // Mock
          engajamento: "85%" // Mock
        });
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das atividades do Instituto Move Marias
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Beneficiárias"
          value={loading ? "..." : stats.totalBeneficiarias.toString()}
          description={loading ? "Carregando..." : `${stats.totalBeneficiarias} cadastradas`}
          icon={<Users className="h-4 w-4" />}
          variant="primary"
        />
        <StatCard
          title="Formulários"
          value={loading ? "..." : stats.formularios.toString()}
          description={loading ? "Carregando..." : "Total preenchidos"}
          icon={<FileText className="h-4 w-4" />}
          variant="success"
        />
        <StatCard
          title="Atendimentos"
          value={loading ? "..." : stats.atendimentosMes.toString()}
          description={loading ? "Carregando..." : "Este mês"}
          icon={<Calendar className="h-4 w-4" />}
          variant="warning"
        />
        <StatCard
          title="Engajamento"
          value={loading ? "..." : stats.engajamento}
          description={loading ? "Carregando..." : "Taxa de participação"}
          icon={<TrendingUp className="h-4 w-4" />}
          variant="success"
        />
      </div>

      {/* Cards de Conteúdo */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas ações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded border">
                <Users className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Nova beneficiária cadastrada</p>
                  <p className="text-xs text-muted-foreground">2h atrás</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded border">
                <FileText className="h-4 w-4 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Formulário preenchido</p>
                  <p className="text-xs text-muted-foreground">4h atrás</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Tarefas Pendentes
            </CardTitle>
            <CardDescription>
              Ações que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start justify-between p-2 rounded border">
                <div className="flex-1">
                  <p className="text-sm font-medium">Revisar cadastros</p>
                  <p className="text-xs text-muted-foreground">Prazo: Hoje</p>
                </div>
                <Badge variant="destructive">Alta</Badge>
              </div>
              <div className="flex items-start justify-between p-2 rounded border">
                <div className="flex-1">
                  <p className="text-sm font-medium">Atualizar relatórios</p>
                  <p className="text-xs text-muted-foreground">Prazo: Amanhã</p>
                </div>
                <Badge>Média</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso direto às funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button className="h-auto p-4 flex-col gap-2" onClick={() => navigate('/beneficiarias/nova')}>
              <Users className="h-6 w-6" />
              <span className="text-sm">Nova Beneficiária</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigate('/beneficiarias')}>
              <FileText className="h-6 w-6" />
              <span className="text-sm">Formulários</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigate('/oficinas')}>
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Agendamentos</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigate('/relatorios')}>
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
