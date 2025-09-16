import { useState, useEffect, useCallback } from "react";
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
  icon: React.ComponentType<{ className?: string }>;
  status?: string;
}

export default function Atividades() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const navigate = useNavigate();

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);

      const data = await api.dashboard.getRecentActivities(20);
      const source: unknown[] = Array.isArray(data?.activities) ? data.activities : [];

      const mapped: Activity[] = source.map((item: unknown, idx) => {
        const activityItem = item as Record<string, unknown>;
        const typeRaw = String(activityItem.type || '').toLowerCase();
        let typeLabel = 'Outros';
        let icon: React.ComponentType<{ className?: string }> = FileText;

        if (typeRaw.includes('beneficiaria')) {
          typeLabel = 'Cadastro';
          icon = Users;
        } else if (typeRaw.includes('anamnese')) {
          typeLabel = 'Formulário';
          icon = FileText;
        } else if (typeRaw.includes('declaracao') || typeRaw.includes('declaração')) {
          typeLabel = 'Atendimento';
          icon = Calendar;
        }

        const createdAt = item.created_at || item.createdAt || new Date().toISOString();
        const description = item.description || item.event || 'Atividade registrada';

        return {
          id: `${typeRaw}-${idx}-${createdAt}`,
          type: typeLabel,
          description,
          time: formatDateTime(createdAt),
          icon,
          status: 'completed'
        } as Activity;
      });

      // Ordena por data
      mapped.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Aplica filtro
      const filtered = filter === 'todas'
        ? mapped
        : mapped.filter(a => a.type.toLowerCase() === filter.toLowerCase());

      setActivities(filtered);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

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
