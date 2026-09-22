# Chatroom

A small single-room chat: React + Express + WebSocket, with messages stored in SQLite.

## Run it

```bash
npm install
npm run dev          # server on :3001, client on :5173
```

Open <http://localhost:5173> in two different browsers (or a normal and a private window).
Each browser is its own user-session.

## Run it the way production does

```bash
npm run build
npm start            # everything on http://localhost:3001
```

Express serves the built React bundle and the WebSocket from the same port, so there is
no CORS setup and no client-side URL configuration anywhere.

## Tests

```bash
npm test
```

26 tests: the model and SQL, the history endpoint, the WebSocket (real clients against a
real server), the `useChat` hook, and the UI.

## How it fits together

```
browser  ──  GET /api/messages  ──▶  router ─▶ controller ─▶ model ─▶ SQLite
         ──  WS /ws             ──▶  chatSocket  ─────────────▶ model ─▶ SQLite
                                         │
                                         └─ broadcast to every connected client
```

- **History** is loaded once over REST when you join.
- **Live traffic** goes over the WebSocket: `join`, `message`, `leave`.
- The server saves every message — including "joined"/"left" notices — and broadcasts the
  saved row, so all clients render from the same source.
- A sent message is **not** rendered optimistically; it appears when the server echoes it
  back. That keeps one rendering path for every message on screen.
- Clicking **Leave** and closing the tab run the same `handleLeave` code, so both produce
  exactly one "left the chat" notice.

## Deploy to Render

`render.yaml` is included. Create a new Web Service from the repo and Render picks it up:

- Build: `npm install && npm run build`
- Start: `npm start`

Render injects `PORT`; nothing else needs configuring.

**Note on the free plan:** it has no persistent disk and spins down when idle, so `chat.db`
is wiped on redeploy. To keep history, move to a paid instance, mount a disk at `/data`,
and set `DB_PATH=/data/chat.db`. That is a dashboard change — no code changes.
