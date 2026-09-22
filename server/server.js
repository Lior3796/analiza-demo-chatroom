import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import messagesRouter from './routers/messagesRouter.js';
import { attachChatSocket } from './ws/chatSocket.js';

const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');

// Exported without listening so tests can start it on a free port.
export function createServer() {
  const app = express();

  app.use(express.json());
  app.use('/api/messages', messagesRouter);
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

  const server = createHttpServer(app);
  const wss = attachChatSocket(server);

  return { app, server, wss };
}
