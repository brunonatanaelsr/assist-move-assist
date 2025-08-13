import request from 'supertest';
import app from '../../app';
import { AuthService } from '../../middleware/auth';

jest.mock('../../middleware/auth');
const mockAuth = AuthService as jest.Mocked<typeof AuthService>;

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    mockAuth.login.mockResolvedValue({
      token: 'token',
      user: { id: 1, email: 'user@test.com', name: 'User', role: 'admin' }
    } as any);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(mockAuth.login).toHaveBeenCalledWith('user@test.com', '123456');
  });

  it('should validate missing fields', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
