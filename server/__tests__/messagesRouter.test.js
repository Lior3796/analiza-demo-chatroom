import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb } from '../db.js';
import { createMessage } from '../models/messageModel.js';
import { createServer } from '../server.js';

let app;

beforeEach(() => {
  resetDb();
  app = createServer().app;
});

describe('GET /api/messages', () => {
  it('returns an empty array when there is no history', async () => {
    const response = await request(app).get('/api/messages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns saved messages through router -> controller -> model', async () => {
    createMessage({ nickname: 'Ada', text: 'hello' });

    const response = await request(app).get('/api/messages');

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ nickname: 'Ada', text: 'hello', type: 'chat' });
  });
});
