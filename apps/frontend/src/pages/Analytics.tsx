import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '@/services/apiService';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBeneficiarias: 0,
    activeBeneficiarias: 0,
    totalAnamneses: 0,
    totalDeclaracoes: 0,
  });
  const [chartData, setChartData] = useState<{ name: string; beneficiarias: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await apiService.getDashboardStats();
        if (resp.success && resp.data) {
          const data: any = resp.data;
          setStats({
            totalBeneficiarias: Number(data.totalBeneficiarias || 0),
            activeBeneficiarias: Number(data.activeBeneficiarias || 0),
            totalAnamneses: Number(data.totalAnamneses || 0),
            totalDeclaracoes: Number(data.totalDeclaracoes || 0),
          });

          const monthly = Array.isArray(data.monthlyRegistrations) ? data.monthlyRegistrations : [];
          const mapped = monthly.map((item: any) => {
            const d = new Date(item.month);
            const name = d.toLocaleDateString('pt-BR', { month: 'short' });
            return { name, beneficiarias: Number(item.count || 0) };
          });
          setChartData(mapped);
        }
      } catch (err) {
        console.error('Falha ao carregar estatísticas', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeneficiarias}</div>
            <p className="text-xs text-muted-foreground">Contagem total no banco</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnamneses}</div>
            <p className="text-xs text-muted-foreground">Total de anamneses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficiárias Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBeneficiarias}</div>
            <p className="text-xs text-muted-foreground">Status 'ativa'</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declarações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeclaracoes}</div>
            <p className="text-xs text-muted-foreground">Registros em banco</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Beneficiárias por mês (dados reais)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] w-full animate-pulse bg-muted rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="beneficiarias" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
