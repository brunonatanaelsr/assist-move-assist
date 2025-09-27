import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, HTMLAttributes, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDashboardStats, useDashboardActivities, useDashboardTasks, defaultDashboardStats } from "@/hooks/useDashboard";
import { useToast } from "@/components/ui/use-toast";
import { translateErrorMessage } from "@/lib/apiError";

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
  const { toast } = useToast();
  const statsQuery = useDashboardStats();
  const activitiesQuery = useDashboardActivities();
  const tasksQuery = useDashboardTasks();

  const stats = statsQuery.data ?? defaultDashboardStats;
  const recentActivities = activitiesQuery.data ?? [];
  const upcomingTasks = tasksQuery.data ?? [];

  const loading = statsQuery.isLoading || activitiesQuery.isLoading || tasksQuery.isLoading;

  useEffect(() => {
    if (statsQuery.error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar estatísticas",
        description: translateErrorMessage(statsQuery.error.message)
      });
    }
  }, [statsQuery.error, toast]);

  useEffect(() => {
    if (activitiesQuery.error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar atividades",
        description: translateErrorMessage(activitiesQuery.error.message)
      });
    }
  }, [activitiesQuery.error, toast]);

  useEffect(() => {
    if (tasksQuery.error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefas",
        description: translateErrorMessage(tasksQuery.error.message)
      });
    }
  }, [tasksQuery.error, toast]);

  const statsErrorMessage = statsQuery.error ? translateErrorMessage(statsQuery.error.message) : undefined;
  const activitiesErrorMessage = activitiesQuery.error ? translateErrorMessage(activitiesQuery.error.message) : undefined;
  const tasksErrorMessage = tasksQuery.error ? translateErrorMessage(tasksQuery.error.message) : undefined;

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
          value={loading ? "..." : statsErrorMessage ? "—" : stats.totalBeneficiarias.toString()}
          description={
            loading
              ? "Carregando..."
              : statsErrorMessage || `${stats.beneficiariasAtivas} ativas • ${stats.beneficiariasInativas} inativas`
          }
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
          value={loading ? "..." : statsErrorMessage ? "—" : stats.formularios.toString()}
          description={loading ? "Carregando..." : statsErrorMessage || "Total preenchidos"}
          icon={<FileText className="h-4 w-4" />}
          variant="success"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data-testid="stats-usuarios"
        />
        <StatCard
          title="Atendimentos"
          value={loading ? "..." : statsErrorMessage ? "—" : stats.atendimentosMes.toString()}
          description={loading ? "Carregando..." : statsErrorMessage || "Este mês"}
          icon={<Calendar className="h-4 w-4" />}
          variant="warning"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data-testid="stats-oficinas"
        />
        <StatCard
          title="Engajamento"
          value={loading ? "..." : statsErrorMessage ? "—" : stats.engajamento}
          description={loading ? "Carregando..." : statsErrorMessage || "Taxa de participação"}
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
              ) : activitiesErrorMessage ? (
                <div className="text-sm text-destructive">{activitiesErrorMessage}</div>
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
              ) : tasksErrorMessage ? (
                <div className="text-sm text-destructive">{tasksErrorMessage}</div>
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
