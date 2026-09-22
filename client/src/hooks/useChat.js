import { useCallback, useRef, useState } from 'react';

function socketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${window.location.host}/ws`;
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'connected' | 'left'
  const socketRef = useRef(null);

  const join = useCallback(async (nickname) => {
    const history = await fetch('/api/messages').then((response) => response.json());
    setMessages(history);

    const socket = new WebSocket(socketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', nickname }));
      setStatus('connected');
    };

    socket.onmessage = (event) => {
      const { message } = JSON.parse(event.data);
      setMessages((current) => [...current, message]);
    };

    // Covers leaving on purpose and losing the connection alike.
    socket.onclose = () => setStatus('left');
  }, []);

  const sendMessage = useCallback((text) => {
    // Nothing is added locally: the message appears when the server echoes it,
    // which keeps one rendering path for every message on screen.
    socketRef.current?.send(JSON.stringify({ type: 'message', text }));
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'leave' }));
    socketRef.current?.close();
  }, []);

  return { messages, status, join, sendMessage, leave };
}
