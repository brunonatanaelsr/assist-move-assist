// Re-export shared Redis instance (with in-memory stub when REDIS_DISABLED=true)
export { default } from '../lib/redis';
export * from '../lib/redis';
