# Minimal Chatroom — React + Express + WebSocket + SQLite

## Context

This is a take-home/live-coding demo for an upcoming interview. `instructions.txt` (Hebrew) asks for:

- A **small chat room** built on React + Node.js with **WebSocket**
- **Low code volume** — no auth/login implementation
- Every user **auto-joins** the room; **each browser is a separate user-session**
- A **local SQL** database of your choice
- Docker is **optional**, not required
- A **"leave the chat room"** function must exist

Because it will be typed and explained live, the overriding constraint is *readability*: vanilla JS only (no TypeScript, no Next.js), function components with hooks only (no classes, no HOCs), and a textbook Express MVC layout (`routers/`, `controllers/`, `models/`).

Decisions confirmed with the user:

| Question | Decision |
|---|---|
| Room scope | One single global room |
| WebSocket library | Native browser `WebSocket` + `ws` on the server (no socket.io) |
| Deploy shape | **One Render web service** — Express serves the built React bundle *and* the WebSocket on one port |
| Persistence | SQLite on Render's free ephemeral disk; history resetting on redeploy/idle spin-down is accepted |
| Identity | A nickname prompt before entering (prefilled with an auto-generated name, so one Enter still reads as "auto-join") |
| Leave button | Closes the socket, broadcasts a leave notice, and shows the leaver a **Rejoin** button |

> **Known trade-off, accepted:** Render's free tier has no persistent disk and spins down when idle, so `chat.db` is wiped on redeploy. The code is byte-identical to the paid-disk version — upgrading later is a Render dashboard change (mount a disk at `/data`, set `DB_PATH=/data/chat.db`), not a code change.

## Step 0 — check this plan into the project

First action on approval: copy this file to `chatroom/.claude/plan.md` so it lives with the code and travels with the repo (the working directory is `chatroom`, so this is the project-level `.claude`, not the global one at `C:\Users\TechLift\.claude`). Say the word if you'd rather it sit at `analiza-demo/.claude/plan.md` alongside `instructions.txt`.

## Target structure

```
chatroom/
  package.json              root scripts: dev, build, start (Render entry point), test
  vitest.config.js          two projects: server (node env) + client (jsdom env)
  server/
    __tests__/
      messageModel.test.js
      chatSocket.test.js
      messagesRouter.test.js
    server.js               express app + http server + ws upgrade
    db.js                   sqlite connection + schema init
    models/
      messageModel.js       all SQL lives here
    controllers/
      messagesController.js request/response handling
    routers/
      messagesRouter.js     route definitions
    ws/
      chatSocket.js         connection registry + broadcast
  client/
    package.json
    vite.config.js          dev proxy: /api and /ws -> localhost:3001
    index.html
    src/
      main.jsx
      App.jsx               screen switching: nickname / chat / left
      hooks/useChat.js      all WebSocket logic, one hook
      components/
        NicknameForm.jsx
        MessageList.jsx
        MessageInput.jsx
      styles.css
      __tests__/
        setup.js            jsdom + a small FakeWebSocket double
        useChat.test.jsx
        App.test.jsx
```

The "V" of MVC is the React client; the server is router → controller → model with no view layer.

## Server

**`server/db.js`** — `better-sqlite3` (synchronous API: no callbacks or promises, which reads far better on a shared screen). Opens `process.env.DB_PATH || './chat.db'` and runs the schema on startup:

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname   TEXT NOT NULL,
  text       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'chat',   -- 'chat' | 'system'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Single global room, so there is deliberately no `rooms` table.

**`models/messageModel.js`** — two functions, the only place SQL appears: `getRecentMessages(limit = 50)` and `createMessage({ nickname, text, type })` (returns the inserted row so it can be broadcast directly).

**`controllers/messagesController.js`** — `listMessages(req, res)` calls the model and responds with JSON.

**`routers/messagesRouter.js`** — `GET /` → `listMessages`, mounted at `/api/messages` in `server.js`.

History is loaded over **REST**, not WebSocket. That is a deliberate choice: it gives the router/controller/model chain something real to do and keeps the socket handler focused on live traffic only.

**`ws/chatSocket.js`** — a `Map` of `ws → nickname` plus a `broadcast(payload)` helper. JSON protocol:

- client → server: `{ type: 'join', nickname }`, `{ type: 'message', text }`, `{ type: 'leave' }`
- server → client: `{ type: 'message', message }` (covers both chat and system rows — the row's own `type` field distinguishes them in the UI)

On `join`: register the socket, persist and broadcast a system row `"<nickname> joined the chat"`.
On `message`: persist via the model, broadcast the saved row.
On `leave` **and** on socket `close`: unregister, persist and broadcast `"<nickname> left the chat"`. Both paths share one `handleLeave(ws)` function so an explicit leave and a closed tab behave identically — that shared path is worth pointing out during the demo.

**`server/server.js`** — creates the Express app, mounts `/api/messages`, serves `client/dist` statically with an SPA catch-all, creates the HTTP server, attaches `new WebSocketServer({ server, path: '/ws' })`, and listens on `process.env.PORT || 3001`.

## Client

**`hooks/useChat.js`** — the one place socket logic lives. Holds `messages`, `status` (`'idle' | 'connected' | 'left'`), and exposes `join(nickname)`, `sendMessage(text)`, `leave()`. The socket instance lives in a `useRef` so re-renders never recreate it. `join` first `fetch`es `/api/messages` for history, then opens the socket.

The WebSocket URL is derived from the page, so **no environment variable is needed in either dev or production**:

```js
const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
const url = `${proto}//${location.host}/ws`;
```

In dev, Vite's proxy (`ws: true`) forwards `/ws` to `localhost:3001`; in production client and server share an origin. Same line of code both ways.

**`App.jsx`** — switches on `status`: `idle` → `NicknameForm`, `connected` → `MessageList` + `MessageInput` + a Leave button, `left` → a short "You left the chat" panel with a Rejoin button that calls `join(nickname)` again.

**`NicknameForm.jsx`** — a single input prefilled with `User-${Math.floor(Math.random() * 10000)}`, so pressing Enter immediately is effectively the spec's auto-join.

**`MessageList.jsx`** — maps rows; `type === 'system'` renders as centered muted italic text, `type === 'chat'` as `nickname: text`. A `useEffect` scrolls to the bottom when `messages` changes.

**`MessageInput.jsx`** — controlled input + form `onSubmit`, clears after send.

### Styling

Deliberately minimal — one small `styles.css`, plain classes, no UI library, no CSS framework, no design skill involved. The goal is that the interviewer's attention stays on the WebSocket and MVC code, not the visuals. Scope is limited to:

- A centered fixed-width column with the message list as the only scrolling region
- A readable system font stack and a consistent spacing value
- Enough visual separation that system rows (joined/left) are obviously not chat rows
- The input pinned below the list so it never moves as messages arrive

No bubbles, avatars, animations, or theming.

## TDD approach

The main features are built test-first so there are no gaps on demo day. **Vitest** is the runner, configured with two projects in one `vitest.config.js`: `server` (node environment) and `client` (jsdom environment). Dev deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `supertest`.

The suite is deliberately lean — one test per behaviour that can actually break, no snapshot tests, no tests of framework behaviour.

### Two design constraints the tests impose

These are the reason the tests are written first; retrofitting them later would mean rewriting both files.

1. **`server/server.js` exports `createServer()`** returning `{ app, server, wss }` rather than calling `listen()` at import time. A separate two-line `server/index.js` is the real entry point that calls `listen()`. Tests start a server on port `0` (an OS-assigned free port) and close it in `afterEach`, so the suite never collides with a running dev server.
2. **`server/db.js` takes its path from `DB_PATH`** and exposes a `resetDb()` helper. Tests point it at `:memory:` so every test file starts from a clean schema with no temp files to clean up.

### Red → green order

**1. Model — `server/__tests__/messageModel.test.js`**
- `createMessage` returns the inserted row with an `id`, the given `nickname`/`text`, and a `created_at`
- `createMessage` defaults `type` to `'chat'` and accepts `'system'`
- `getRecentMessages` returns rows oldest-first (the order the UI renders them)
- `getRecentMessages(limit)` returns the *most recent* N, not the first N — the classic off-by-one-query bug here is `LIMIT` without an inner `ORDER BY ... DESC`, and it only shows up once the demo has more than N messages

**2. History endpoint — `server/__tests__/messagesRouter.test.js`**
- `GET /api/messages` returns 200 and a JSON array
- Messages inserted via the model come back in the response — proves router → controller → model is wired end to end

**3. WebSocket — `server/__tests__/chatSocket.test.js`** (real `ws` clients against a real server; this file is the heart of the suite)
- **Send + receive:** client A sends `{type:'message'}`, client B receives a `message` frame with the same text and A's nickname
- **Echo to sender:** A also receives its own message, so the UI has a single render path for all messages
- **Persistence:** after a send, `getRecentMessages()` contains the row — proves messages are saved, not just relayed
- **Join broadcast:** when B joins, A receives a `system` row containing B's nickname
- **Explicit leave:** B sends `{type:'leave'}`; A receives a `system` leave row
- **Implicit leave:** B's socket is terminated *without* a leave frame; A still receives the same leave row — this guards the shared `handleLeave(ws)` path and is the single most likely thing to be broken during a live demo (closing a tab)
- **No double-leave:** a client that sends `leave` and then disconnects produces exactly one leave row, not two
- **Malformed input:** a non-JSON frame and a `{type:'message'}` sent before any `join` must not crash the server — the process staying up is the assertion

**4. Hook — `client/src/__tests__/useChat.test.jsx`**
A small `FakeWebSocket` class in `setup.js` replaces `globalThis.WebSocket`, capturing sent frames and letting tests push server frames in.
- `join()` fetches history (mocked `fetch`) and populates `messages` before the socket opens
- `join()` sends a `join` frame with the nickname once the socket is open
- An incoming `message` frame appends to `messages`
- `sendMessage(text)` sends a `message` frame and does **not** optimistically append (the server echo is the only source of truth — asserting this prevents duplicate-message bugs)
- `leave()` sends a `leave` frame, closes the socket, and sets `status` to `'left'`
- An unexpected socket close also sets `status` to `'left'` rather than leaving the UI stuck

**5. UI — `client/src/__tests__/App.test.jsx`** (React Testing Library + `user-event`)
- On load the nickname screen renders with a prefilled input; submitting it shows the chat view
- Typing and submitting a message renders it once the server frame arrives, and clears the input
- A `system` row renders differently from a `chat` row (asserted by role/class, not by exact styling)
- Clicking **Leave** shows the "You left" panel with a **Rejoin** button
- Clicking **Rejoin** returns to the chat view and reopens the socket

### Guard against the gaps that bite in a live demo

Explicitly covered above, because each has burned this exact kind of app before: closing a tab without clicking Leave, double leave notices, duplicate messages from optimistic rendering, `getRecentMessages` returning the oldest rows instead of the newest, and a malformed frame taking the whole server down in front of the interviewer.

## Root scripts (`chatroom/package.json`)

- `dev` — runs server and Vite together (two terminals is also fine and is the fallback if `concurrently` feels like noise)
- `build` — installs client deps and runs `vite build` into `client/dist`
- `start` — `node server/index.js`
- `test` — `vitest run` (and `test:watch` for the red-green loop while building)

Render config: **Build Command** `npm install && npm run build`, **Start Command** `npm start`. Render injects `PORT`; nothing else to configure. Because it is one service, there is no CORS setup and no client-side URL env var anywhere.

## Verification

0. **`npm test` is green** — the full suite above passes. This is the primary verification; the manual steps below confirm the parts tests can't see (real browsers, real network, real deploy).
1. **Local, two browsers** — `npm run dev`, open `localhost:5173` in Chrome and in a private/other browser window. Confirm each gets its own session, join notices appear in the other window, and messages land in both instantly.
2. **History** — refresh one window; prior messages reload from SQLite via `GET /api/messages`.
3. **Persistence** — stop the server, restart it, refresh: history is still there (this is the local-disk behaviour; on Render free it resets on redeploy, as agreed).
4. **Leave** — click Leave; the other window shows "X left the chat", the leaver sees the Rejoin panel. Click Rejoin — the socket reopens and a join notice appears in the other window.
5. **Closed tab** — close a tab without clicking Leave; the other window must still show the leave notice, proving the shared `handleLeave` path.
6. **Production shape locally** — `npm run build && npm start`, open `localhost:3001` directly and repeat steps 1 and 4 against the built bundle. This is exactly what Render runs, so it catches static-serving or `wss` bugs before deploying.
7. **Deployed** — push, deploy on Render, open the URL in two devices and repeat steps 1 and 4 over `wss://`.

## Out of scope

Multiple rooms, an online-users list, typing indicators, auth, Docker, and TypeScript. All were considered and dropped to honour the spec's "low code volume".

Note that the spec asks for low code volume while you've asked for server *and* full UI tests — the test code will likely exceed the app code. That's a defensible trade for a live demo where a bug is costly, and worth saying out loud to the interviewer rather than letting them notice it. If you'd rather shrink it later, the client tests (`useChat.test.jsx`, `App.test.jsx`) are the part to drop; the server suite is what actually protects the demo.
