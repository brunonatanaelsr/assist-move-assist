import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  CalendarEvent,
  CalendarFilter,
  CalendarStats,
  CalendarView,
  RecurrenceRule
} from '../types/calendar';

const CALENDAR_CACHE_KEY = 'calendar';

export default function useCalendar() {
  const queryClient = useQueryClient();

  const getEvents = (filter: CalendarFilter) => {
    return useQuery({
      queryKey: [CALENDAR_CACHE_KEY, 'events', filter],
      queryFn: () => api.get<CalendarEvent[]>('/calendar/events', { params: filter }).then(r => r.data),
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  const getEvent = (eventId: number) => {
    return useQuery({
      queryKey: [CALENDAR_CACHE_KEY, 'event', eventId],
      queryFn: () => api.get<CalendarEvent>(`/calendar/events/${eventId}`).then(r => r.data),
      staleTime: 5 * 60 * 1000,
    });
  };

  const getStats = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: [CALENDAR_CACHE_KEY, 'stats', { startDate, endDate }],
      queryFn: () => api.get<CalendarStats>('/calendar/stats', {
        params: { start_date: startDate, end_date: endDate }
      }).then(r => r.data),
      staleTime: 30 * 60 * 1000, // 30 minutos
    });
  };

  const createEvent = useMutation({
    mutationFn: (event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<CalendarEvent>('/calendar/events', event).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'events'] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'stats'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, ...event }: Partial<CalendarEvent> & { id: number }) =>
      api.put<CalendarEvent>(`/calendar/events/${id}`, event).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'events'] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'event', data.id] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'stats'] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => api.delete(`/calendar/events/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'events'] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'stats'] });
    },
  });

  const createRecurringEvent = useMutation({
    mutationFn: (data: { 
      event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>,
      recurrence: RecurrenceRule
    }) => api.post<CalendarEvent[]>('/calendar/events/recurring', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'events'] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'stats'] });
    },
  });

  const updateParticipantStatus = useMutation({
    mutationFn: ({ eventId, participantId, status }: { 
      eventId: number;
      participantId: number;
      status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
    }) => api.put(`/calendar/events/${eventId}/participants/${participantId}`, { status }).then(r => r.data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'event', eventId] });
    },
  });

  const markAttendance = useMutation({
    mutationFn: ({ eventId, participantId, attended }: {
      eventId: number;
      participantId: number;
      attended: boolean;
    }) => api.put(`/calendar/events/${eventId}/attendance/${participantId}`, { attended }).then(r => r.data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_CACHE_KEY, 'stats'] });
    },
  });

  return {
    getEvents,
    getEvent,
    getStats,
    createEvent,
    updateEvent,
    deleteEvent,
    createRecurringEvent,
    updateParticipantStatus,
    markAttendance
  };
}
