import { useState } from 'react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim()) return;

    onSend(text.trim());
    setText('');
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label htmlFor="message" className="visually-hidden">Message</label>
      <input
        id="message"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a message"
        autoComplete="off"
      />
      <button type="submit">Send</button>
    </form>
  );
}
