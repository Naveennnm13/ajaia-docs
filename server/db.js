const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS document_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    shared_with_id TEXT NOT NULL,
    shared_by_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_id) REFERENCES users(id),
    FOREIGN KEY (shared_by_id) REFERENCES users(id),
    UNIQUE(document_id, shared_with_id)
  );
`);

// Seed users if none exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const seedUsers = [
    { id: uuidv4(), name: 'Alice Chen', email: 'alice@ajaia.ai' },
    { id: uuidv4(), name: 'Bob Martinez', email: 'bob@ajaia.ai' },
    { id: uuidv4(), name: 'Charlie Park', email: 'charlie@ajaia.ai' },
  ];
  const insert = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
  seedUsers.forEach(u => insert.run(u.id, u.name, u.email));
  console.log('Seeded 3 demo users');
}

module.exports = db;
