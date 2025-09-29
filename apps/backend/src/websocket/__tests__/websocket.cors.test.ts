import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { io as createClient, Socket } from 'socket.io-client';
import type { Pool } from 'pg';

jest.mock('../../lib/redis', () => ({
  redis: {
    lrange: jest.fn().mockResolvedValue([]),
    lpush: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(0),
    lrem: jest.fn().mockResolvedValue(0),
    multi: jest.fn(() => ({
      lpush: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    }))
  }
}));

describe('WebSocket CORS configuration', () => {
  let WebSocketServer: typeof import('../server').WebSocketServer;
  let config: typeof import('../../config').config;
  const userPayload = {
    id: 'user-123',
    nome: 'Usuária Teste',
    email: 'user@example.com'
  };

  const createPoolStub = () => {
    const queryMock = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const client = {
      query: queryMock,
      on: jest.fn(),
      release: jest.fn()
    };

    return {
      connect: jest.fn().mockResolvedValue(client),
      query: queryMock
    } as unknown as Pool;
  };

  const createToken = (secret: string) =>
    jwt.sign(userPayload, secret, { expiresIn: '15m' });

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://allowed.test,http://second.test';
    jest.resetModules();
    ({ config } = await import('../../config'));
    ({ WebSocketServer } = await import('../server'));

    expect(config.websocket.cors.origin).toEqual([
      'http://allowed.test',
      'http://second.test'
    ]);
  });

  afterAll(() => {
    delete process.env.CORS_ORIGIN;
  });

  const connectWithOrigin = (port: number, token: string, origin: string) =>
    new Promise<Socket>((resolve, reject) => {
      const headers = {
        Origin: origin,
        origin
      };

      const instance = createClient(`http://localhost:${port}`, {
        path: config.websocket.path,
        forceNew: true,
        reconnection: false,
        auth: { token },
        extraHeaders: headers,
        transportOptions: {
          polling: { extraHeaders: headers },
          websocket: { extraHeaders: headers }
        }
      });

      instance.on('connect', () => resolve(instance));
      instance.on('connect_error', reject);
    });

  it('permite conexões provenientes das origens configuradas', async () => {
    const httpServer = http.createServer();
    const wsServer = new WebSocketServer(httpServer, createPoolStub());
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;

    const token = createToken(config.jwt.secret);

    try {
      const seenOrigins: Array<string | undefined> = [];
      ((wsServer as any).io.engine as any).on('headers', (_headers: unknown, req: any) => {
        seenOrigins.push(req.headers.origin as string | undefined);
      });

      const client = await connectWithOrigin(port, token, 'http://allowed.test');

      client.disconnect();
      expect(seenOrigins).toContain('http://allowed.test');
    } finally {
      await new Promise<void>((resolve) => (wsServer as any).io.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  it('rejeita conexões de origens não autorizadas', async () => {
    const httpServer = http.createServer();
    const wsServer = new WebSocketServer(httpServer, createPoolStub());
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;

    const token = createToken(config.jwt.secret);

    try {
      const error = await new Promise<Error>((resolve) => {
        const headers = {
          Origin: 'http://malicious.test',
          origin: 'http://malicious.test'
        };

        const instance = createClient(`http://localhost:${port}`, {
          path: config.websocket.path,
          forceNew: true,
          reconnection: false,
          auth: { token },
          extraHeaders: headers,
          transportOptions: {
            polling: { extraHeaders: headers },
            websocket: { extraHeaders: headers }
          }
        });

        instance.on('connect', () => {
          instance.disconnect();
          resolve(new Error('Connection should have been rejected'));
        });

        instance.on('connect_error', (err) => {
          instance.disconnect();
          resolve(err instanceof Error ? err : new Error(String(err)));
        });
      });

      expect(error.message).toMatch(/xhr poll error/i);

      const responseText = (error as any)?.context?.responseText;
      if (typeof responseText === 'string' && responseText.length > 0) {
        const payload = JSON.parse(responseText);
        expect(payload.message).toMatch(/CORS: Origin not allowed/);
      } else if ((error as any)?.data?.message) {
        expect((error as any).data.message).toMatch(/CORS: Origin not allowed/);
      }
    } finally {
      await new Promise<void>((resolve) => (wsServer as any).io.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });
});
