import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { FakeWebSocket, mockHistory, chatMessage, systemMessage } from './setup.js';

beforeEach(() => mockHistory());

// Walks through the nickname screen into a connected chat room.
async function enterChat(user, nickname = 'Grace') {
  const input = screen.getByLabelText(/nickname/i);
  await user.clear(input);
  await user.type(input, `${nickname}{Enter}`);
  await act(async () => FakeWebSocket.last.open());
}

describe('App', () => {
  it('starts on the nickname screen with a name already filled in', () => {
    render(<App />);

    expect(screen.getByLabelText(/nickname/i).value).toMatch(/^User-\d+$/);
  });

  it('enters the chat room after submitting a nickname', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterChat(user);

    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('shows a sent message once the server echoes it back, and clears the input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterChat(user);

    await user.type(screen.getByLabelText(/message/i), 'hello{Enter}');
    await act(async () => FakeWebSocket.last.receive(chatMessage(1, 'Grace', 'hello')));

    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toHaveValue('');
  });

  it('renders system notices differently from chat messages', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterChat(user);

    await act(async () => {
      FakeWebSocket.last.receive(systemMessage(1, 'Ada', 'Ada joined the chat'));
      FakeWebSocket.last.receive(chatMessage(2, 'Ada', 'hello'));
    });

    expect(await screen.findByTestId('system-1')).toBeInTheDocument();
    expect(screen.getByTestId('chat-2')).toBeInTheDocument();
  });

  it('offers a way back after leaving', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterChat(user);

    await user.click(screen.getByRole('button', { name: /leave/i }));

    expect(await screen.findByText(/you left the chat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoin/i })).toBeInTheDocument();
  });

  it('reconnects when rejoining', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterChat(user);
    await user.click(screen.getByRole('button', { name: /leave/i }));

    await user.click(await screen.findByRole('button', { name: /rejoin/i }));
    await act(async () => FakeWebSocket.last.open());

    await waitFor(() => expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument());
    expect(FakeWebSocket.last.sent).toContainEqual({ type: 'join', nickname: 'Grace' });
  });
});
