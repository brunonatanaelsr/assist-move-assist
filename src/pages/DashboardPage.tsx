import { useState } from 'react';
import { Card, Grid, Typography, Box, Button, CircularProgress } from '@mui/material';
import { useReports } from '../hooks/useReports';
import { FilterParams } from '../types/report';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import DateRangePicker from '../components/DateRangePicker';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterParams>({});
  const { getDashboardMetrics } = useReports();
  
  const { data: metrics, isLoading } = getDashboardMetrics(filters);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h6" color="textSecondary">
          Não foi possível carregar os dados do dashboard
        </Typography>
      </Box>
    );
  }

  const overviewCards = [
    {
      title: 'Total de Beneficiárias',
      value: metrics.total_beneficiarias,
      subtitle: `${metrics.active_beneficiarias} ativas`
    },
    {
      title: 'Projetos',
      value: metrics.total_projects,
      subtitle: `${metrics.active_projects} ativos`
    },
    {
      title: 'Atividades',
      value: metrics.total_activities,
      subtitle: `${metrics.completed_activities} concluídas`
    },
    {
      title: 'Taxa de Engajamento',
      value: `${(metrics.engagement_rate * 100).toFixed(1)}%`,
      subtitle: 'Média geral'
    }
  ];

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Box display="flex" gap={2}>
          <DateRangePicker
            startDate={filters.date_range?.start_date}
            endDate={filters.date_range?.end_date}
            onChange={(start_date, end_date) => 
              setFilters(prev => ({ ...prev, date_range: { start_date, end_date } }))
            }
          />
          <Button 
            variant="contained" 
            onClick={() => setFilters({})}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        {overviewCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="textSecondary">
                {card.title}
              </Typography>
              <Typography variant="h4" component="div" sx={{ my: 1 }}>
                {card.value}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {card.subtitle}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Atividades por Período
            </Typography>
            <Line
              data={{
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [
                  {
                    label: 'Atividades Concluídas',
                    data: [65, 75, 70, 80, 85, 90],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
              height={300}
            />
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Distribuição de Status
            </Typography>
            <Pie
              data={{
                labels: ['Em Andamento', 'Concluído', 'Pendente'],
                datasets: [
                  {
                    data: [12, 19, 3],
                    backgroundColor: [
                      'rgba(255, 159, 64, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(255, 99, 132, 0.8)',
                    ]
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
              height={300}
            />
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
