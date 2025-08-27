import { jest } from '@jest/globals';

const redis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushdb: jest.fn(),
  quit: jest.fn(),
};

export default redis;
