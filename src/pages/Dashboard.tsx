import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, HTMLAttributes, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/apiService";
import { cn } from "@/lib/utils";

// Componente StatCard local
interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  variant = "default",
  className,
  ...cardProps
}: StatCardProps) => {
  const variantStyles = {
    default: "border-border",
    primary: "border-primary/20 bg-primary/10",
    success: "border-green-200 bg-green-50",
    warning: "border-yellow-200 bg-yellow-50"
  };

  return (
    <Card className={cn(variantStyles[variant], className)} {...cardProps}>
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBeneficiarias: 0,
    beneficiariasAtivas: 0,
    beneficiariasInativas: 0,
    formularios: 0,
    atendimentosMes: 0,
    engajamento: "0%"
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas reais do PostgreSQL
      const statsResponse = await apiService.getDashboardStats();
      if (statsResponse.success) {
        const data = statsResponse.data;
        setStats({
          totalBeneficiarias: data.totalBeneficiarias || 0,
          beneficiariasAtivas: data.activeBeneficiarias || 0,
          beneficiariasInativas: data.inactiveBeneficiarias || 0,
          formularios: data.totalFormularios || 0,
          atendimentosMes: data.totalAtendimentos || 0,
          engajamento: `${data.engajamento || 0}%`
        });
      }

      // Carregar atividades recentes reais
      const activitiesResponse = await apiService.getDashboardActivities();
      if (activitiesResponse.success) {
        setRecentActivities(activitiesResponse.data);
      }

      // Carregar tarefas pendentes reais
      const tasksResponse = await apiService.getDashboardTasks();
      if (tasksResponse.success) {
        setUpcomingTasks(tasksResponse.data);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      
      // Fallback para dados básicos em caso de erro
      const fallbackResponse = await apiService.getBeneficiarias();
      if (fallbackResponse.success) {
        const beneficiarias = fallbackResponse.data || [];
        setStats({
          totalBeneficiarias: beneficiarias.length,
          beneficiariasAtivas: 0,
          beneficiariasInativas: 0,
          formularios: 0,
          atendimentosMes: 0,
          engajamento: "0%"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das atividades do Instituto Move Marias
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Beneficiárias"
          value={loading ? "..." : stats.totalBeneficiarias.toString()}
          description={loading ? "Carregando..." : `${stats.beneficiariasAtivas} ativas • ${stats.beneficiariasInativas} inativas`}
          icon={<Users className="h-4 w-4" />}
          variant="primary"
          // test ids
          // container and count for E2E
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data-testid="stats-beneficiarias"
        />
        {/* count element for tests */}
        <div className="hidden" data-testid="stats-beneficiarias-count">{stats.totalBeneficiarias}</div>
        <StatCard
          title="Formulários"
          value={loading ? "..." : stats.formularios.toString()}
          description={loading ? "Carregando..." : "Total preenchidos"}
          icon={<FileText className="h-4 w-4" />}
          variant="success"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data-testid="stats-usuarios"
        />
        <StatCard
          title="Atendimentos"
          value={loading ? "..." : stats.atendimentosMes.toString()}
          description={loading ? "Carregando..." : "Este mês"}
          icon={<Calendar className="h-4 w-4" />}
          variant="warning"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data-testid="stats-oficinas"
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
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando atividades...</div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded border">
                    {activity.icon === 'Users' && <Users className="h-4 w-4 text-primary" />}
                    {activity.icon === 'FileText' && <FileText className="h-4 w-4 text-green-500" />}
                    {activity.icon === 'Calendar' && <Calendar className="h-4 w-4 text-primary" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.type}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.time).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma atividade recente</div>
              )}
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
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando tarefas...</div>
              ) : upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Prazo: {task.due}</p>
                    </div>
                    <Badge 
                      variant={
                        task.priority === "Alta" ? "destructive" : 
                        task.priority === "Média" ? "default" : 
                        "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma tarefa pendente</div>
              )}
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
