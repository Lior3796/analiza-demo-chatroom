import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname   TEXT NOT NULL,
    text       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'chat',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const db = new Database(process.env.DB_PATH || './chat.db');

db.exec(SCHEMA);

// Used by the tests to start each case from an empty database.
export function resetDb() {
  db.exec('DROP TABLE IF EXISTS messages;');
  db.exec(SCHEMA);
}
