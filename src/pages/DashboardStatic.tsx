import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <Card className={`${variantStyles[variant]} shadow-soft`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardStatic() {
  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das atividades do Instituto Move Marias
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Beneficiárias"
          value="150"
          description="+5 este mês"
          icon={<Users />}
          variant="primary"
        />
        <StatCard
          title="Formulários Preenchidos"
          value="89"
          description="Total no sistema"
          icon={<FileText />}
          variant="success"
        />
        <StatCard
          title="Atendimentos este Mês"
          value="24"
          description="Comparecimentos registrados"
          icon={<Calendar />}
          variant="warning"
        />
        <StatCard
          title="Taxa de Engajamento"
          value="92%"
          description="Participação nos programas"
          icon={<TrendingUp />}
          variant="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activities */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Nova beneficiária cadastrada</p>
                      <p className="text-xs text-muted-foreground">Maria Silva foi adicionada ao sistema</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">2h atrás</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="shadow-soft">
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
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Revisar cadastros pendentes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prazo: Hoje
                    </p>
                  </div>
                  <Badge variant="destructive" className="flex-shrink-0">
                    Alta
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                Ver todas as tarefas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
