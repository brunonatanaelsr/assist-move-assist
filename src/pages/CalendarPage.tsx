import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Button,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Tooltip
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  ViewDay,
  ViewWeek,
  ViewMonth,
  ViewAgenda
} from '@mui/icons-material';
import { Calendar, luxonLocalizer } from 'react-big-calendar';
import { DateTime } from 'luxon';
import { useCalendar } from '../hooks/useCalendar';
import { CalendarEvent, CalendarView, CalendarFilter } from '../types/calendar';
import EventDialog from './EventDialog';
import CalendarFilters from './CalendarFilters';
import CalendarStats from './CalendarStats';

const localizer = luxonLocalizer(DateTime);

const viewOptions: CalendarView['type'][] = ['month', 'week', 'day', 'agenda'];

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView['type']>('month');
  const [currentDate, setCurrentDate] = useState(DateTime.now().toISO());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filters, setFilters] = useState<CalendarFilter>({
    startDate: DateTime.now().startOf('month').toISO(),
    endDate: DateTime.now().endOf('month').toISO()
  });

  const {
    getEvents,
    getStats,
    createEvent,
    updateEvent,
    deleteEvent
  } = useCalendar();

  const { data: events = [], isLoading } = getEvents(filters);
  const { data: stats } = getStats(filters.startDate, filters.endDate);

  const handleViewChange = (newView: CalendarView['type']) => {
    setView(newView);
    const date = DateTime.fromISO(currentDate);
    
    let start, end;
    switch (newView) {
      case 'month':
        start = date.startOf('month');
        end = date.endOf('month');
        break;
      case 'week':
        start = date.startOf('week');
        end = date.endOf('week');
        break;
      case 'day':
        start = date.startOf('day');
        end = date.endOf('day');
        break;
      default:
        start = date.startOf('month');
        end = date.endOf('month');
    }

    setFilters(prev => ({
      ...prev,
      startDate: start.toISO(),
      endDate: end.toISO()
    }));
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const date = DateTime.fromISO(currentDate);
    let newDate;

    switch (action) {
      case 'PREV':
        newDate = date.minus({ [view]: 1 });
        break;
      case 'NEXT':
        newDate = date.plus({ [view]: 1 });
        break;
      case 'TODAY':
        newDate = DateTime.now();
        break;
      default:
        newDate = date;
    }

    setCurrentDate(newDate.toISO());
    handleViewChange(view);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async (event: Partial<CalendarEvent>) => {
    try {
      if (selectedEvent) {
        await updateEvent.mutateAsync({ id: selectedEvent.id, ...event });
      } else {
        await createEvent.mutateAsync(event as Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteEvent.mutateAsync(id);
        setIsDialogOpen(false);
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
      }
    }
  };

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#1976d2';  // default blue

    switch (event.type) {
      case 'OFICINA':
        backgroundColor = '#2e7d32';  // green
        break;
      case 'REUNIAO':
        backgroundColor = '#ed6c02';  // orange
        break;
      case 'ATIVIDADE':
        backgroundColor = '#9c27b0';  // purple
        break;
    }

    if (event.status === 'CANCELADO') {
      backgroundColor = '#d32f2f';  // red
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.status === 'CANCELADO' ? 0.6 : 1,
        border: 'none',
        color: 'white'
      }
    };
  }, []);

  return (
    <Box p={3}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => handleNavigate('PREV')}>
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={() => handleNavigate('NEXT')}>
              <ChevronRight />
            </IconButton>
            <Button onClick={() => handleNavigate('TODAY')}>Hoje</Button>
            <Typography variant="h6">
              {DateTime.fromISO(currentDate).toLocaleString({
                month: 'long',
                year: 'numeric'
              })}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              onClick={() => handleViewChange('day')}
              color={view === 'day' ? 'primary' : 'default'}
            >
              <ViewDay />
            </IconButton>
            <IconButton
              onClick={() => handleViewChange('week')}
              color={view === 'week' ? 'primary' : 'default'}
            >
              <ViewWeek />
            </IconButton>
            <IconButton
              onClick={() => handleViewChange('month')}
              color={view === 'month' ? 'primary' : 'default'}
            >
              <ViewMonth />
            </IconButton>
            <IconButton
              onClick={() => handleViewChange('agenda')}
              color={view === 'agenda' ? 'primary' : 'default'}
            >
              <ViewAgenda />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateEvent}
            >
              Novo Evento
            </Button>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Box flex={1}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 250px)' }}
              view={view}
              onView={(newView: CalendarView['type']) => handleViewChange(newView)}
              onSelectEvent={handleEventClick}
              eventPropGetter={eventStyleGetter}
              messages={{
                today: 'Hoje',
                previous: 'Anterior',
                next: 'Próximo',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                agenda: 'Agenda',
                date: 'Data',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'Não há eventos neste período'
              }}
            />
          </Box>
          
          {showStats && (
            <Box width="300px">
              <CalendarStats stats={stats} />
            </Box>
          )}
        </Box>
      </Paper>

      <CalendarFilters
        filters={filters}
        onChange={setFilters}
      />

      <EventDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
      />
    </Box>
  );
}
