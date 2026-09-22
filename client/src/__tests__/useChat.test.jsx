import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat.js';
import { FakeWebSocket, mockHistory, chatMessage } from './setup.js';

beforeEach(() => mockHistory());

describe('useChat', () => {
  it('loads history before the socket opens', async () => {
    mockHistory([chatMessage(1, 'Ada', 'earlier')]);
    const { result } = renderHook(() => useChat());

    await act(() => result.current.join('Grace'));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('earlier');
  });

  it('sends a join frame once the socket is open', async () => {
    const { result } = renderHook(() => useChat());

    await act(() => result.current.join('Grace'));
    act(() => FakeWebSocket.last.open());

    expect(FakeWebSocket.last.sent).toEqual([{ type: 'join', nickname: 'Grace' }]);
    await waitFor(() => expect(result.current.status).toBe('connected'));
  });

  it('appends messages arriving from the server', async () => {
    const { result } = renderHook(() => useChat());
    await act(() => result.current.join('Grace'));
    act(() => FakeWebSocket.last.open());

    act(() => FakeWebSocket.last.receive(chatMessage(2, 'Ada', 'hello')));

    await waitFor(() => expect(result.current.messages.map((m) => m.text)).toEqual(['hello']));
  });

  it('sends a message without rendering it optimistically', async () => {
    const { result } = renderHook(() => useChat());
    await act(() => result.current.join('Grace'));
    act(() => FakeWebSocket.last.open());

    act(() => result.current.sendMessage('hi there'));

    // The server echo is the only thing that puts a message on screen,
    // otherwise the sender would see every message twice.
    expect(result.current.messages).toHaveLength(0);
    expect(FakeWebSocket.last.sent).toContainEqual({ type: 'message', text: 'hi there' });
  });

  it('leaves the room on request', async () => {
    const { result } = renderHook(() => useChat());
    await act(() => result.current.join('Grace'));
    act(() => FakeWebSocket.last.open());
    const socket = FakeWebSocket.last;

    act(() => result.current.leave());

    expect(socket.sent).toContainEqual({ type: 'leave' });
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    await waitFor(() => expect(result.current.status).toBe('left'));
  });

  it('reports an unexpected disconnect as left rather than hanging', async () => {
    const { result } = renderHook(() => useChat());
    await act(() => result.current.join('Grace'));
    act(() => FakeWebSocket.last.open());

    act(() => FakeWebSocket.last.close());

    await waitFor(() => expect(result.current.status).toBe('left'));
  });
});
