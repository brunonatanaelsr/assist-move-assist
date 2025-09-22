import { useEffect, useMemo, useState } from 'react';
import { Calendar, dayjsLocalizer, View } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/types/calendar';
import { useCalendar } from '@/hooks/useCalendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

dayjs.locale('pt-br');
const localizer = dayjsLocalizer(dayjs);

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const unit = (v: View): any => (v === 'agenda' ? 'month' : (v === 'work_week' ? 'week' : (v as any)));
  const startOf = useMemo(() => (dayjs(date) as any).startOf(unit(view)).toDate(), [date, view]);
  const endOf = useMemo(() => (dayjs(date) as any).endOf(unit(view)).toDate(), [date, view]);

  const filters = useMemo(() => ({
    startDate: startOf.toISOString(),
    endDate: endOf.toISOString(),
  }), [startOf, endOf]);

  const { getEvents, getStats, createEvent, updateEvent, deleteEvent } = useCalendar();
  const { data: events = [] } = getEvents(filters);
  const { data: stats } = getStats(filters.startDate, filters.endDate);

  const rbcEvents = (events || []).map((e: any) => ({
    ...e,
    start: new Date(e.start || e.data_inicio || e.inicio),
    end: new Date(e.end || e.data_fim || e.fim),
    title: e.title || e.titulo,
  }));

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setTitle('');
    setOpen(true);
  };

  const onSelectEvent = (e: any) => {
    setSelectedEvent({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.start?.toISOString?.() || e.start,
      end: e.end?.toISOString?.() || e.end,
      allDay: !!e.all_day || !!e.allDay,
      location: e.location,
      type: e.type || 'OUTRO',
      status: e.status || 'AGENDADO',
      organizer_id: 0,
      created_at: '',
      updated_at: ''
    } as CalendarEvent);
    setTitle(e.title || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (selectedEvent) {
      await updateEvent.mutateAsync({ id: selectedEvent.id, title });
    } else {
      const start = dayjs(date).hour(9).minute(0).toISOString();
      const end = dayjs(date).hour(10).minute(0).toISOString();
      await createEvent.mutateAsync({ title, start, end, allDay: false, type: 'OUTRO', status: 'AGENDADO' } as any);
    }
    setOpen(false);
  };

  const handleDelete = async () => {
    if (selectedEvent?.id) {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setOpen(false);
    }
  };

  useEffect(() => {
    // trigger refetch by changing filters (already in deps)
  }, [date, view]);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" onClick={() => setDate((dayjs(date) as any).subtract(1, unit(view)).toDate())}>Anterior</Button>
            <Button variant="outline" onClick={() => setDate(new Date())}>Hoje</Button>
            <Button variant="outline" onClick={() => setDate((dayjs(date) as any).add(1, unit(view)).toDate())}>Próximo</Button>
            <div className="ml-auto flex gap-1">
              <Button variant={view==='month'?'default':'outline'} onClick={() => setView('month')}>Mês</Button>
              <Button variant={view==='week'?'default':'outline'} onClick={() => setView('week')}>Semana</Button>
              <Button variant={view==='day'?'default':'outline'} onClick={() => setView('day')}>Dia</Button>
              <Button variant={view==='agenda'?'default':'outline'} onClick={() => setView('agenda')}>Agenda</Button>
            </div>
          </div>
          <div className="h-[70vh]">
            <Calendar
              localizer={localizer}
              events={rbcEvents}
              startAccessor="start"
              endAccessor="end"
              views={['month','week','day','agenda']}
              view={view}
              onView={(v) => setView(v as View)}
              date={date}
              onNavigate={(d) => setDate(d)}
              selectable
              onSelectSlot={onSelectSlot as any}
              onSelectEvent={onSelectEvent as any}
              popup
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Título</label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              {selectedEvent && <Button variant="destructive" onClick={handleDelete}>Excluir</Button>}
              <Button onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
