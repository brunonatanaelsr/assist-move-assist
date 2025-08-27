import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Typography,
  Grid
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DateTime } from 'luxon';
import { CalendarEvent, RecurrenceRule } from '../types/calendar';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  onSave: (event: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function EventDialog({
  open,
  onClose,
  event,
  onSave,
  onDelete
}: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<DateTime>(DateTime.now());
  const [end, setEnd] = useState<DateTime>(DateTime.now().plus({ hours: 1 }));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>('OUTRO');
  const [status, setStatus] = useState<CalendarEvent['status']>('AGENDADO');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>({
    frequency: 'WEEKLY',
    interval: 1
  });

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStart(DateTime.fromISO(event.start));
      setEnd(DateTime.fromISO(event.end));
      setAllDay(event.allDay);
      setLocation(event.location || '');
      setType(event.type);
      setStatus(event.status);
      if (event.recurrence) {
        setIsRecurring(true);
        setRecurrence(event.recurrence);
      }
    } else {
      resetForm();
    }
  }, [event]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStart(DateTime.now());
    setEnd(DateTime.now().plus({ hours: 1 }));
    setAllDay(false);
    setLocation('');
    setType('OUTRO');
    setStatus('AGENDADO');
    setIsRecurring(false);
    setRecurrence({
      frequency: 'WEEKLY',
      interval: 1
    });
  };

  const handleSubmit = async () => {
    const eventData: Partial<CalendarEvent> = {
      title,
      description,
      start: start.toISO(),
      end: end.toISO(),
      allDay,
      location,
      type,
      status,
      ...(isRecurring ? { recurrence } : {})
    };

    await onSave(eventData);
    resetForm();
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {event ? 'Editar Evento' : 'Novo Evento'}
        {onDelete && (
          <IconButton
            onClick={handleDelete}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="Início"
              value={start}
              onChange={(newValue) => newValue && setStart(newValue)}
              slotProps={{
                textField: { fullWidth: true }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="Fim"
              value={end}
              onChange={(newValue) => newValue && setEnd(newValue)}
              slotProps={{
                textField: { fullWidth: true }
              }}
              minDateTime={start}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={type}
                label="Tipo"
                onChange={(e) => setType(e.target.value as CalendarEvent['type'])}
              >
                <MenuItem value="OFICINA">Oficina</MenuItem>
                <MenuItem value="REUNIAO">Reunião</MenuItem>
                <MenuItem value="ATIVIDADE">Atividade</MenuItem>
                <MenuItem value="OUTRO">Outro</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as CalendarEvent['status'])}
              >
                <MenuItem value="AGENDADO">Agendado</MenuItem>
                <MenuItem value="CONFIRMADO">Confirmado</MenuItem>
                <MenuItem value="CANCELADO">Cancelado</MenuItem>
                <MenuItem value="CONCLUIDO">Concluído</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Local"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
              }
              label="Dia inteiro"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
              }
              label="Evento recorrente"
            />
          </Grid>

          {isRecurring && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequência</InputLabel>
                  <Select
                    value={recurrence.frequency}
                    label="Frequência"
                    onChange={(e) => setRecurrence({
                      ...recurrence,
                      frequency: e.target.value as RecurrenceRule['frequency']
                    })}
                  >
                    <MenuItem value="DAILY">Diário</MenuItem>
                    <MenuItem value="WEEKLY">Semanal</MenuItem>
                    <MenuItem value="MONTHLY">Mensal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Intervalo"
                  value={recurrence.interval}
                  onChange={(e) => setRecurrence({
                    ...recurrence,
                    interval: parseInt(e.target.value)
                  })}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title || !start || !end}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
