import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";

export default function DashboardTest() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Teste simples do API service
        console.log('API Service disponível:', apiService);
        setApiData({ message: "API Service carregado" });
      } catch (error) {
        console.error('Erro ao testar API:', error);
        setApiData({ error: error.message });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-3xl font-bold">Dashboard Teste</h1>
      <Card>
        <CardHeader>
          <CardTitle>Teste Card</CardTitle>
          <CardDescription>
            {loading ? "Carregando..." : "Carregado!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Users className="w-6 h-6" />
            <Button onClick={() => setCount(count + 1)}>
              Clicou {count} vezes
            </Button>
            <Badge>Teste Badge</Badge>
          </div>
          {apiData && (
            <div className="mt-4 p-2 bg-gray-100 rounded">
              <pre>{JSON.stringify(apiData, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
      <p>Se você está vendo tudo, API Service funciona!</p>
    </div>
  );
}
