import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// A stand-in for the browser WebSocket: it records what the app sent
// and lets a test push frames back as if the server had sent them.
export class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  static get last() {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  send(raw) {
    this.sent.push(JSON.parse(raw));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  // --- helpers the tests drive the fake socket with ---

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(message) {
    this.onmessage?.({ data: JSON.stringify({ type: 'message', message }) });
  }
}

FakeWebSocket.CONNECTING = 0;
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSED = 3;

globalThis.WebSocket = FakeWebSocket;

// jsdom does not implement scrolling, so the auto-scroll in MessageList
// needs a no-op stand-in here.
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  FakeWebSocket.instances = [];
  vi.restoreAllMocks();
});

export function mockHistory(messages = []) {
  globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => messages });
}

export function chatMessage(id, nickname, text) {
  return { id, nickname, text, type: 'chat', created_at: '2026-01-01 00:00:00' };
}

export function systemMessage(id, nickname, text) {
  return { id, nickname, text, type: 'system', created_at: '2026-01-01 00:00:00' };
}
