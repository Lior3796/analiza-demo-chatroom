import { db } from '../db.js';

export function createMessage({ nickname, text, type = 'chat' }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO messages (nickname, text, type) VALUES (?, ?, ?)')
    .run(nickname, text, type);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(lastInsertRowid);
}

export function getRecentMessages(limit = 50) {
  // Take the newest rows, then flip them so the UI renders oldest first.
  const newestFirst = db
    .prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?')
    .all(limit);

  return newestFirst.reverse();
}
