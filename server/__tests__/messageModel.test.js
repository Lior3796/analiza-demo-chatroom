import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '../db.js';
import { createMessage, getRecentMessages } from '../models/messageModel.js';

beforeEach(() => resetDb());

describe('messageModel', () => {
  it('returns the inserted row from createMessage', () => {
    const row = createMessage({ nickname: 'Ada', text: 'hello' });

    expect(row.id).toBeTypeOf('number');
    expect(row.nickname).toBe('Ada');
    expect(row.text).toBe('hello');
    expect(row.created_at).toBeTruthy();
  });

  it('defaults type to chat and accepts system', () => {
    expect(createMessage({ nickname: 'Ada', text: 'hi' }).type).toBe('chat');

    const system = createMessage({ nickname: 'Ada', text: 'Ada joined', type: 'system' });
    expect(system.type).toBe('system');
  });

  it('returns messages oldest first', () => {
    createMessage({ nickname: 'Ada', text: 'first' });
    createMessage({ nickname: 'Ada', text: 'second' });

    expect(getRecentMessages().map((m) => m.text)).toEqual(['first', 'second']);
  });

  it('keeps the newest messages when a limit is given', () => {
    createMessage({ nickname: 'Ada', text: 'one' });
    createMessage({ nickname: 'Ada', text: 'two' });
    createMessage({ nickname: 'Ada', text: 'three' });

    expect(getRecentMessages(2).map((m) => m.text)).toEqual(['two', 'three']);
  });
});
