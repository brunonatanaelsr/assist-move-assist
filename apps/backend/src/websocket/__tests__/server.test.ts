jest.mock('socket.io', () => {
  const mockServerInstance = {
    use: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
  };

  const MockServer = jest.fn(() => mockServerInstance);

  return {
    Server: MockServer
  };
});

import { WebSocketServer } from '../server';
import { mockPool } from '../../setupTests';

describe('WebSocketServer - markNotificationAsRead', () => {
  beforeEach(() => {
    const mockClient = {
      query: jest.fn().mockResolvedValue(undefined),
      on: jest.fn()
    };

    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  it('não lança exceção quando REDIS_DISABLED=true', async () => {
    const server = new WebSocketServer({} as any, mockPool as any);

    await expect(
      (server as any).markNotificationAsRead('user-1', 'notification-1')
    ).resolves.toBeUndefined();
  });
});
