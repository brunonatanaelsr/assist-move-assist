import { jest } from '@jest/globals';
import { Pool } from 'pg';

const pool = {
  query: jest.fn(),
  end: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

export default pool;
