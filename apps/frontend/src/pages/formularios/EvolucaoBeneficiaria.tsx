import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formulariosApi } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

export default function EvolucaoBeneficiaria() {
  const { id } = useParams<{ id: string }>();
  const beneficiariaId = Number(id);
  const [data, setData] = useState<Array<{ mes: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await formulariosApi.getFichaEvolucaoSeries(beneficiariaId);
        if (resp.success && resp.data) {
          setData(resp.data.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    if (beneficiariaId) load();
  }, [beneficiariaId]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link to={`/beneficiarias/${beneficiariaId}/formularios`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Evolução da Beneficiária</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros por mês (Ficha de Evolução)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tendência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

