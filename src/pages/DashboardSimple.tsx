import { Users, FileText, Calendar, TrendingUp } from "lucide-react";
import StatCard from "@/components/ui/stat-card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do sistema Move Marias
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Beneficiárias"
          value="3"
          description="+2 desde o mês passado"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Oficinas Ativas"
          value="2"
          description="+1 nova oficina"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Participações"
          value="5"
          description="+3 este mês"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Engajamento"
          value="100%"
          description="Meta alcançada"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-2">Sistema funcionando!</h3>
        <p className="text-muted-foreground">
          Autenticação e dashboard básico operacionais.
        </p>
      </div>
    </div>
  );
}
