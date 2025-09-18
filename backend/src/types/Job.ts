export interface Job<TPayload = any> {
  execute(payload: TPayload): Promise<void>;
}

export type JobPayload<T extends Job<any>> = T extends Job<infer Payload>
  ? Payload
  : never;
