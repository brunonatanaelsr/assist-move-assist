import type { CleanupJobPayload } from '../jobs/CleanupJob';
import type { NotificationJobPayload } from '../jobs/NotificationJob';
import type { ReminderJobPayload } from '../jobs/ReminderJob';
import type { ReportJobPayload } from '../jobs/ReportJob';

export interface JobPayloadMap {
  send_notification: NotificationJobPayload;
  send_reminder: ReminderJobPayload;
  generate_report: ReportJobPayload;
  cleanup_data: CleanupJobPayload;
}

export type JobType = keyof JobPayloadMap;
