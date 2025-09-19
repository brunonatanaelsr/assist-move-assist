export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface WebhookError {
  message: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface StoredWebhookEvent<TPayload = WebhookPayload> {
  id: string;
  endpoint: string;
  event_type: string;
  payload: TPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  next_retry_at: Date | null;
  error_message: string | null;
}
