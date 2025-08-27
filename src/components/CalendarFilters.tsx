import { useState } from 'react';
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Button,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTime } from 'luxon';
import { CalendarFilter } from '../types/calendar';

interface CalendarFiltersProps {
  filters: CalendarFilter;
  onChange: (filters: CalendarFilter) => void;
}

export default function CalendarFilters({
  filters,
  onChange
}: CalendarFiltersProps) {
  const handleChange = (field: keyof CalendarFilter, value: any) => {
    onChange({
      ...filters,
      [field]: value
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: DateTime | null) => {
    if (value) {
      handleChange(field, value.toISO());
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box display="flex" gap={2} flexWrap="wrap">
        <DatePicker
          label="Data Inicial"
          value={DateTime.fromISO(filters.startDate)}
          onChange={(newValue) => handleDateChange('startDate', newValue)}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 200 }
            }
          }}
        />

        <DatePicker
          label="Data Final"
          value={DateTime.fromISO(filters.endDate)}
          onChange={(newValue) => handleDateChange('endDate', newValue)}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 200 }
            }
          }}
        />

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tipos</InputLabel>
          <Select
            multiple
            value={filters.types || []}
            onChange={(e) => handleChange('types', e.target.value)}
            input={<OutlinedInput label="Tipos" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            <MenuItem value="OFICINA">Oficina</MenuItem>
            <MenuItem value="REUNIAO">Reunião</MenuItem>
            <MenuItem value="ATIVIDADE">Atividade</MenuItem>
            <MenuItem value="OUTRO">Outro</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filters.status || []}
            onChange={(e) => handleChange('status', e.target.value)}
            input={<OutlinedInput label="Status" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            <MenuItem value="AGENDADO">Agendado</MenuItem>
            <MenuItem value="CONFIRMADO">Confirmado</MenuItem>
            <MenuItem value="CANCELADO">Cancelado</MenuItem>
            <MenuItem value="CONCLUIDO">Concluído</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Buscar"
          size="small"
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          sx={{ width: 200 }}
        />

        <Button
          variant="outlined"
          onClick={() => onChange({
            startDate: DateTime.now().startOf('month').toISO(),
            endDate: DateTime.now().endOf('month').toISO()
          })}
        >
          Limpar Filtros
        </Button>
      </Box>
    </Paper>
  );
}
