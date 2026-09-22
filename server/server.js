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
  // Any other path is a client-side route and gets the app shell, except
  // unknown /api paths, which should 404 rather than return HTML.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    res.sendFile(path.join(clientDist, 'index.html'));
  });

  const server = createHttpServer(app);
  const wss = attachChatSocket(server);

  return { app, server, wss };
}
