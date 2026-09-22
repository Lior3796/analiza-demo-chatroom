import { useState } from 'react';
import { useChat } from './hooks/useChat.js';
import NicknameForm from './components/NicknameForm.jsx';
import MessageList from './components/MessageList.jsx';
import MessageInput from './components/MessageInput.jsx';

export default function App() {
  const { messages, status, join, sendMessage, leave } = useChat();
  const [nickname, setNickname] = useState('');

  function handleJoin(name) {
    setNickname(name);
    join(name);
  }

  return (
    <main className="app">
      <h1>Chatroom</h1>

      {status === 'idle' && <NicknameForm onJoin={handleJoin} />}

      {status === 'connected' && (
        <>
          <MessageList messages={messages} />
          <MessageInput onSend={sendMessage} />
          <button type="button" className="leave" onClick={leave}>
            Leave the chat
          </button>
        </>
      )}

      {status === 'left' && (
        <div className="panel">
          <p>You left the chat.</p>
          <button type="button" onClick={() => join(nickname)}>
            Rejoin
          </button>
        </div>
      )}
    </main>
  );
}
