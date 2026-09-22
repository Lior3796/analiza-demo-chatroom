import { useEffect, useRef } from 'react';

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  return (
    <ul className="messages">
      {messages.map((message) => (
        <li
          key={message.id}
          className={message.type}
          data-testid={`${message.type}-${message.id}`}
        >
          {message.type === 'chat' && <span className="nickname">{message.nickname}</span>}
          <span>{message.text}</span>
        </li>
      ))}
      <li ref={bottomRef} />
    </ul>
  );
}
