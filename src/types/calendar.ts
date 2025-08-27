export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  type: 'OFICINA' | 'REUNIAO' | 'ATIVIDADE' | 'OUTRO';
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO';
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    until?: string;
    byWeekDay?: number[];
    exceptions?: string[];
  };
  project_id?: number;
  participant_ids?: number[];
  organizer_id: number;
  created_at: string;
  updated_at: string;
  notifications?: CalendarNotification[];
  metadata?: Record<string, any>;
}

export interface CalendarNotification {
  id: number;
  event_id: number;
  type: 'EMAIL' | 'PUSH' | 'SMS';
  time: number; // minutos antes do evento
  sent: boolean;
  scheduled_for?: string;
  sent_at?: string;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: string;
  filter?: {
    types?: string[];
    projects?: number[];
    participants?: number[];
    status?: string[];
  };
}

export interface CalendarEventGroup {
  title: string;
  events: CalendarEvent[];
  color?: string;
}

export interface CalendarFilter {
  startDate: string;
  endDate: string;
  types?: string[];
  projects?: number[];
  participants?: number[];
  status?: string[];
  search?: string;
}

export interface CalendarStats {
  total_events: number;
  upcoming_events: number;
  events_this_month: number;
  events_by_type: Record<string, number>;
  events_by_status: Record<string, number>;
  popular_times: {
    weekday: number;
    hour: number;
    count: number;
  }[];
  attendance_rate: number;
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  until?: string;
  byWeekDay?: number[];
  exceptions?: string[];
}

export interface Participant {
  id: number;
  name: string;
  email: string;
  response?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'PENDING';
  attended?: boolean;
  notes?: string;
}
