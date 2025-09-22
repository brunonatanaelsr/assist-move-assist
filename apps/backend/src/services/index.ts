import { AuthService } from './auth.service';
import { pool } from '../config/database';
import redis from '../lib/redis';

export const authService = new AuthService(pool, redis as any);
