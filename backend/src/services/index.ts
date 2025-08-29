import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { pool } from '../config/database';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export const authService = new AuthService(pool, redis);
