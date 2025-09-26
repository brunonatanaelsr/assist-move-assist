import { useState } from 'react';
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Box } from '@mui/material';
import dayjs from '@/lib/dayjs';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate: string, endDate: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [start, setStart] = useState(startDate ? dayjs(startDate) : null);
  const [end, setEnd] = useState(endDate ? dayjs(endDate) : null);

  const handleStartChange = (newValue: dayjs.Dayjs | null) => {
    setStart(newValue);
    if (newValue && end) {
      onChange(newValue.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    }
  };

  const handleEndChange = (newValue: dayjs.Dayjs | null) => {
    setEnd(newValue);
    if (start && newValue) {
      onChange(start.format('YYYY-MM-DD'), newValue.format('YYYY-MM-DD'));
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Box display="flex" gap={2}>
        <DatePicker
          label="Data Inicial"
          value={start}
          onChange={handleStartChange}
          format="DD/MM/YYYY"
          maxDate={end || undefined}
          slotProps={{
            textField: {
              size: "small"
            }
          }}
        />
        <DatePicker
          label="Data Final"
          value={end}
          onChange={handleEndChange}
          format="DD/MM/YYYY"
          minDate={start || undefined}
          slotProps={{
            textField: {
              size: "small"
            }
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}
