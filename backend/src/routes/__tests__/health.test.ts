import request from 'supertest';
import app from '../../app';
import { checkDbConnection } from '../../config/database';

jest.mock('../../config/database');
const mockCheck = checkDbConnection as jest.MockedFunction<typeof checkDbConnection>;

describe('Health Routes', () => {
  beforeEach(() => {
    mockCheck.mockResolvedValue({ success: true } as any);
  });

  it('should return overall health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('should return database health', async () => {
    const res = await request(app).get('/health/db');
    expect(res.status).toBe(200);
    expect(mockCheck).toHaveBeenCalled();
  });
});
