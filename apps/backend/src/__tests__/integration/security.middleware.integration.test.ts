import request from 'supertest';
import type { Request, Response } from 'express';
import { app } from '../../app';

const describeIfEnabled = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;

describeIfEnabled('Security middleware integration', () => {
  const testRoute = '/__test__/security-middleware';

  beforeAll(() => {
    app.post(testRoute, (req: Request, res: Response) => {
      res.status(200).json({
        body: req.body,
        query: req.query,
      });
    });
  });

  it('sanitizes malicious payloads and prevents parameter pollution', async () => {
    const maliciousPayload = {
      name: '<script>alert(1)</script>',
      nested: {
        description: '<img src="x" onerror="alert(1)" />',
      },
      $where: 'malicious',
    } as Record<string, unknown>;

    const response = await request(app)
      .post(`${testRoute}?safe=1&safe=2`)
      .send(maliciousPayload);

    expect(response.status).toBe(200);
    expect(response.body.body.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(response.body.body.nested.description).toBe('&lt;img src="x" onerror="alert(1)" /&gt;');
    expect(response.body.body).not.toHaveProperty('$where');
    expect(response.body.query.safe).toBe('2');
  });
});
