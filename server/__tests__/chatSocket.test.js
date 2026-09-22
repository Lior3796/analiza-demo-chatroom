import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { resetDb } from '../db.js';
import { getRecentMessages } from '../models/messageModel.js';
import { createServer } from '../server.js';

let server;
let port;
const openSockets = [];

beforeEach(async () => {
  resetDb();
  server = createServer().server;
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

afterEach(async () => {
  openSockets.splice(0).forEach((socket) => socket.close());
  await new Promise((resolve) => server.close(resolve));
});

// Connects a client, joins the room, and keeps every frame it receives.
async function join(nickname) {
  const socket = new WebSocket(`ws://localhost:${port}/ws`);
  const frames = [];

  socket.on('message', (raw) => frames.push(JSON.parse(raw)));
  await new Promise((resolve) => socket.on('open', resolve));
  socket.send(JSON.stringify({ type: 'join', nickname }));

  openSockets.push(socket);
  return { socket, frames };
}

// Waits until a frame satisfying the predicate arrives, or fails the test.
function waitFor(frames, predicate, timeout = 1000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const found = frames.find(predicate);
      if (found) return resolve(found);
      if (Date.now() - startedAt > timeout) return reject(new Error('timed out waiting for frame'));
      setTimeout(check, 10);
    };
    check();
  });
}

const isChat = (text) => (frame) => frame.message.type === 'chat' && frame.message.text === text;
const mentions = (word) => (frame) => frame.message.type === 'system' && frame.message.text.includes(word);

describe('chat socket', () => {
  it('delivers a message from one client to another', async () => {
    const ada = await join('Ada');
    const grace = await join('Grace');

    ada.socket.send(JSON.stringify({ type: 'message', text: 'hello' }));

    const received = await waitFor(grace.frames, isChat('hello'));
    expect(received.message.nickname).toBe('Ada');
  });

  it('echoes the message back to its sender', async () => {
    const ada = await join('Ada');

    ada.socket.send(JSON.stringify({ type: 'message', text: 'hello' }));

    await expect(waitFor(ada.frames, isChat('hello'))).resolves.toBeTruthy();
  });

  it('saves messages to the database', async () => {
    const ada = await join('Ada');

    ada.socket.send(JSON.stringify({ type: 'message', text: 'hello' }));
    await waitFor(ada.frames, isChat('hello'));

    const saved = getRecentMessages().filter((m) => m.type === 'chat');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ nickname: 'Ada', text: 'hello' });
  });

  it('announces a user who joins', async () => {
    const ada = await join('Ada');
    await join('Grace');

    await expect(waitFor(ada.frames, mentions('Grace'))).resolves.toBeTruthy();
  });

  it('announces a user who leaves explicitly', async () => {
    const ada = await join('Ada');
    const grace = await join('Grace');
    await waitFor(ada.frames, mentions('Grace'));

    grace.socket.send(JSON.stringify({ type: 'leave' }));

    const notice = await waitFor(ada.frames, (frame) => mentions('Grace')(frame) && frame.message.text.includes('left'));
    expect(notice.message.nickname).toBe('Grace');
  });

  it('announces a user whose socket drops without leaving', async () => {
    const ada = await join('Ada');
    const grace = await join('Grace');
    await waitFor(ada.frames, mentions('Grace'));

    grace.socket.terminate();

    await expect(
      waitFor(ada.frames, (frame) => mentions('Grace')(frame) && frame.message.text.includes('left')),
    ).resolves.toBeTruthy();
  });

  it('announces a leave only once when a client leaves then disconnects', async () => {
    const ada = await join('Ada');
    const grace = await join('Grace');
    await waitFor(ada.frames, mentions('Grace'));

    grace.socket.send(JSON.stringify({ type: 'leave' }));
    await waitFor(ada.frames, (frame) => mentions('Grace')(frame) && frame.message.text.includes('left'));
    grace.socket.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const leaveNotices = ada.frames.filter((frame) => mentions('Grace')(frame) && frame.message.text.includes('left'));
    expect(leaveNotices).toHaveLength(1);
  });

  it('survives malformed frames and messages sent before joining', async () => {
    const stranger = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve) => stranger.on('open', resolve));
    openSockets.push(stranger);

    stranger.send('this is not json');
    stranger.send(JSON.stringify({ type: 'message', text: 'no nickname yet' }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The server is still alive and serving new clients.
    const ada = await join('Ada');
    ada.socket.send(JSON.stringify({ type: 'message', text: 'still here' }));

    await expect(waitFor(ada.frames, isChat('still here'))).resolves.toBeTruthy();
    expect(getRecentMessages().some((m) => m.text === 'no nickname yet')).toBe(false);
  });
});
