export interface Job<TPayload = Record<string, unknown>> {
  execute(payload: TPayload): Promise<void>;
}

export type JobPayload<T extends Job<unknown>> = T extends Job<infer Payload>
  ? Payload
  : never;

export type JobConstructor<TPayload> = new (...args: unknown[]) => Job<TPayload>;
