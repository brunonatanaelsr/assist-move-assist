import { useState, useEffect, type ComponentType } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileText, Calendar, Clock, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface Activity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: ComponentType<{ className?: string }>;
  status?: string;
}

export default function Atividades() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const navigate = useNavigate();

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Get beneficiarias from PostgreSQL API
      const response = await api.getBeneficiarias();
      const beneficiarias = response.success ? response.data : [];
      
      // Get recent beneficiarias (last 10)
      const recentBeneficiarias = beneficiarias.slice(-10).reverse();

      const allActivities: Activity[] = [];

      // Add recent beneficiarias
      recentBeneficiarias?.forEach((beneficiaria, index) => {
        allActivities.push({
          id: `beneficiaria-${index}-${beneficiaria.created_at || new Date().toISOString()}`,
          type: "Cadastro",
          description: `${beneficiaria.nome_completo} foi cadastrada no sistema`,
          time: formatDateTime(beneficiaria.created_at || new Date().toISOString()),
          icon: Users,
          status: "completed"
        });
      });

      // Mock recent forms activities
      recentBeneficiarias.slice(0, 3).forEach((beneficiaria, index) => {
        allActivities.push({
          id: `form-${index}-${Date.now()}`,
          type: "Formulário",
          description: `Anamnese Social - ${beneficiaria.nome_completo}`,
          time: formatDateTime(new Date(Date.now() - 1000 * 60 * 60 * (index + 1)).toISOString()),
          icon: FileText,
          status: "completed"
        });
      });

      // Mock recent declarations
      recentBeneficiarias.slice(0, 2).forEach((beneficiaria, index) => {
        allActivities.push({
          id: `declaration-${index}-${Date.now()}`,
          type: "Atendimento",
          description: `Declaração de comparecimento - ${beneficiaria.nome_completo}`,
          time: formatDateTime(new Date(Date.now() - 1000 * 60 * 60 * (index + 3)).toISOString()),
          icon: Calendar,
          status: "completed"
        });
      });

      // Mock recent evolutions
      recentBeneficiarias.slice(0, 2).forEach((beneficiaria, index) => {
        allActivities.push({
          id: `evolution-${index}-${Date.now()}`,
          type: "Evolução",
          description: `Ficha de evolução - ${beneficiaria.nome_completo}`,
          time: formatDateTime(new Date(Date.now() - 1000 * 60 * 60 * (index + 5)).toISOString()),
          icon: FileText,
          status: "completed"
        });
      });

      // Sort by most recent
      allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      // Apply filter
      const filteredActivities = filter === "todas" 
        ? allActivities 
        : allActivities.filter(activity => activity.type.toLowerCase() === filter.toLowerCase());

      setActivities(filteredActivities);
      
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "urgent":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">Todas as Atividades</h1>
          <p className="text-muted-foreground">
            Histórico completo de atividades do sistema
          </p>
        </div>
        
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar atividades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as atividades</SelectItem>
            <SelectItem value="cadastro">Cadastros</SelectItem>
            <SelectItem value="formulário">Formulários</SelectItem>
            <SelectItem value="atendimento">Atendimentos</SelectItem>
            <SelectItem value="evolução">Evoluções</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activities List */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Atividades
          </CardTitle>
          <CardDescription>
            {filter === "todas" ? "Todas as atividades" : `Atividades de ${filter}`} do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === "todas" 
                  ? "Nenhuma atividade encontrada" 
                  : `Nenhuma atividade de ${filter} encontrada`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.type}
                      </p>
                      {activity.status && (
                        <Badge variant={getStatusColor(activity.status)} className="text-xs">
                          {activity.status === "completed" ? "Concluído" : 
                           activity.status === "pending" ? "Pendente" : "Urgente"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}