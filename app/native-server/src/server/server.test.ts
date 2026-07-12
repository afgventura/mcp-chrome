import { describe, expect, test, afterAll, beforeAll } from '@jest/globals';
import supertest from 'supertest';
import Server from './index';

describe('服务器测试', () => {
  // 启动服务器测试实例
  beforeAll(async () => {
    await Server.getInstance().ready();
  });

  // 关闭服务器
  afterAll(async () => {
    await Server.stop();
  });

  test('GET /ping 应返回正确响应', async () => {
    const response = await supertest(Server.getInstance().server)
      .get('/ping')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      status: 'ok',
      message: 'pong',
    });
  });

  test('isolates concurrent Streamable HTTP sessions', async () => {
    const app = Server.getInstance();
    const clients = await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        const response = await app.inject({
          method: 'POST',
          url: '/mcp',
          payload: {
            jsonrpc: '2.0',
            id: `initialize-${index}`,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: { name: `test-client-${index}`, version: '1.0.0' },
            },
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().id).toBe(`initialize-${index}`);
        expect(response.headers['mcp-session-id']).toBeTruthy();
        return {
          index,
          sessionId: response.headers['mcp-session-id'] as string,
        };
      }),
    );

    const responses = await Promise.all(
      clients.map(({ index, sessionId }) =>
        app.inject({
          method: 'POST',
          url: '/mcp',
          headers: { 'mcp-session-id': sessionId },
          payload: { jsonrpc: '2.0', id: `ping-${index}`, method: 'ping' },
        }),
      ),
    );

    responses.forEach((response, index) => {
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ jsonrpc: '2.0', id: `ping-${index}`, result: {} });
    });
  });

  test('rejects notification streams and accepts stateless session termination', async () => {
    await supertest(Server.getInstance().server)
      .get('/mcp')
      .expect('Allow', 'POST, DELETE')
      .expect(405);

    const initialized = await supertest(Server.getInstance().server)
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {} },
      })
      .expect(200);
    const sessionId = initialized.headers['mcp-session-id'] as string;

    await supertest(Server.getInstance().server)
      .delete('/mcp')
      .set('mcp-session-id', sessionId)
      .expect(204);

    const afterTermination = await supertest(Server.getInstance().server)
      .post('/mcp')
      .set('mcp-session-id', sessionId)
      .send({ jsonrpc: '2.0', id: 2, method: 'ping' })
      .expect(200);
    expect(afterTermination.body).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
  });
});
