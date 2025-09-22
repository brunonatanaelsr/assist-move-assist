import type { Pool } from 'pg'
import type Redis from 'ioredis'

export type MockPool = {
  query: jest.Mock<any, any>
}

export type MockRedis = {
  get: jest.Mock<any, any>
  setex: jest.Mock<any, any>
  del: jest.Mock<any, any>
  keys?: jest.Mock<any, any>
}

export const createMockPool = (): MockPool => ({
  query: jest.fn()
})

export const createMockRedis = (): MockRedis => ({
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn().mockResolvedValue([])
})

// Type helpers to cast when needed in tests
export const asPool = (mock: MockPool) => mock as unknown as Pool
export const asRedis = (mock: MockRedis) => mock as unknown as Redis
