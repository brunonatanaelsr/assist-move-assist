export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'mention'
  | 'assignment'
  | 'reminder'
  | 'activity'
  | 'form_response';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  action_url?: string;
  data?: Record<string, any>;
  created_at: string;
}

export interface NotificationPreferences {
  id: number;
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  assignment_notifications: boolean;
  activity_notifications: boolean;
  form_response_notifications: boolean;
  reminder_notifications: boolean;
  notification_types: NotificationType[];
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface CreateNotificationInput {
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  action_url?: string;
  data?: Record<string, any>;
}

export interface UpdateNotificationInput {
  read?: boolean;
}
