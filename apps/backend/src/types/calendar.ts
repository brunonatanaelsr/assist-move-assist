export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  all_day: boolean;
  location?: string;
  type: EventType;
  status: EventStatus;
  project_id?: number;
  organizer_id: number;
  recurrence_rule_id?: number;
  created_at: Date;
  updated_at: Date;
}

export enum EventType {
  OFICINA = 'OFICINA',
  REUNIAO = 'REUNIAO',
  ATIVIDADE = 'ATIVIDADE',
  OUTRO = 'OUTRO'
}

export enum EventStatus {
  AGENDADO = 'AGENDADO',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
  CONCLUIDO = 'CONCLUIDO'
}

export interface RecurrenceRule {
  id: number;
  frequency: RecurrenceFrequency;
  interval: number;
  until_date?: Date;
  by_weekday?: number[];
  exceptions?: Date[];
  created_at: Date;
  updated_at: Date;
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface EventParticipant {
  id: number;
  event_id: number;
  participant_id: number;
  response: ParticipantResponse;
  attended?: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export enum ParticipantResponse {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE',
  PENDING = 'PENDING'
}

export interface CalendarNotification {
  id: number;
  event_id: number;
  type: NotificationType;
  minutes_before: number;
  sent: boolean;
  scheduled_for?: Date;
  sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

export interface EventStats {
  total_events: number;
  upcoming_events: number;
  events_this_month: number;
  events_by_type: Record<EventType, number>;
  events_by_status: Record<EventStatus, number>;
  popular_times: PopularTime[];
  attendance_rate: number;
}

export interface PopularTime {
  weekday: number;
  hour: number;
  count: number;
}

export interface EventFilter {
  start_date?: Date;
  end_date?: Date;
  types?: EventType[];
  project_ids?: number[];
  participant_ids?: number[];
  status?: EventStatus[];
  search?: string;
}
