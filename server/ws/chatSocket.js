import { WebSocketServer } from 'ws';
import { createMessage } from '../models/messageModel.js';

export function attachChatSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const nicknames = new Map(); // socket -> nickname

  function broadcast(message) {
    const frame = JSON.stringify({ type: 'message', message });

    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(frame);
    }
  }

  function announce(nickname, what) {
    broadcast(createMessage({ nickname, text: `${nickname} ${what} the chat`, type: 'system' }));
  }

  function handleJoin(socket, nickname) {
    if (nicknames.has(socket) || !nickname) return;

    nicknames.set(socket, nickname);
    announce(nickname, 'joined');
  }

  function handleMessage(socket, text) {
    const nickname = nicknames.get(socket);
    if (!nickname || !text) return;

    broadcast(createMessage({ nickname, text }));
  }

  // Shared by the Leave button and by a socket that simply closed,
  // so closing a tab behaves exactly like leaving on purpose.
  function handleLeave(socket) {
    const nickname = nicknames.get(socket);
    if (!nickname) return;

    nicknames.delete(socket);
    announce(nickname, 'left');
  }

  wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return; // Ignore anything that is not JSON.
      }

      if (payload.type === 'join') handleJoin(socket, payload.nickname);
      if (payload.type === 'message') handleMessage(socket, payload.text);
      if (payload.type === 'leave') handleLeave(socket);
    });

    socket.on('close', () => handleLeave(socket));
  });

  return wss;
}
