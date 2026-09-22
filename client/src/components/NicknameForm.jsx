import { useState } from 'react';

const suggestedNickname = `User-${Math.floor(Math.random() * 10000)}`;

export default function NicknameForm({ onJoin }) {
  const [nickname, setNickname] = useState(suggestedNickname);

  function handleSubmit(event) {
    event.preventDefault();
    if (nickname.trim()) onJoin(nickname.trim());
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <label htmlFor="nickname">Nickname</label>
      <input
        id="nickname"
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        autoComplete="off"
      />
      <button type="submit">Join the chat</button>
    </form>
  );
}
