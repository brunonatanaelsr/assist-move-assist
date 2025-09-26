import {
  Box,
  Paper,
  Typography,
  Divider,
  LinearProgress,
  Chip
} from '@mui/material';
import { CalendarStats as CalendarStatsType } from '../types/calendar';

interface CalendarStatsProps {
  stats?: CalendarStatsType;
}

export default function CalendarStats({ stats }: CalendarStatsProps) {
  if (!stats) {
    return (
      <Box p={2}>
        <Typography variant="subtitle2" color="textSecondary">
          Carregando estatísticas...
        </Typography>
        <LinearProgress sx={{ mt: 1 }} />
      </Box>
    );
  }

  const eventTypes = Object.entries(stats.events_by_type)
    .sort(([, a], [, b]) => b - a);

  const eventStatus = Object.entries(stats.events_by_status)
    .sort(([, a], [, b]) => b - a);

  const popularTimes = stats.popular_times
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const weekdays = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado'
  ];

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Estatísticas
      </Typography>

      <Box mb={3}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Visão Geral
        </Typography>
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
          <Box>
            <Typography variant="h4">{stats.total_events}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total de Eventos
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4">{stats.upcoming_events}</Typography>
            <Typography variant="body2" color="textSecondary">
              Eventos Futuros
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box mb={3}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Por Tipo
        </Typography>
        {eventTypes.map(([type, count]) => (
          <Box key={type} display="flex" alignItems="center" mb={1}>
            <Box flexGrow={1}>
              <Typography variant="body2">{type}</Typography>
            </Box>
            <Chip
              label={count}
              size="small"
              sx={{ minWidth: 50 }}
            />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box mb={3}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Por Status
        </Typography>
        {eventStatus.map(([status, count]) => (
          <Box key={status} display="flex" alignItems="center" mb={1}>
            <Box flexGrow={1}>
              <Typography variant="body2">{status}</Typography>
            </Box>
            <Chip
              label={count}
              size="small"
              sx={{ minWidth: 50 }}
            />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Horários Populares
        </Typography>
        {popularTimes.map(({ weekday, hour, count }) => (
          <Box key={`${weekday}-${hour}`} mb={1}>
            <Typography variant="body2">
              {weekdays[weekday]}, {hour}h
            </Typography>
            <Box display="flex" alignItems="center" mt={0.5}>
              <LinearProgress
                variant="determinate"
                value={(count / popularTimes[0].count) * 100}
                sx={{ flexGrow: 1, mr: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {count}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Taxa de Presença
        </Typography>
        <Box display="flex" alignItems="center">
          <Box flexGrow={1}>
            <LinearProgress
              variant="determinate"
              value={stats.attendance_rate * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="body2" sx={{ ml: 1 }}>
            {Math.round(stats.attendance_rate * 100)}%
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
