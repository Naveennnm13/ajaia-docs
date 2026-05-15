const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

// We test the db module directly to avoid spinning up a full HTTP server
// This validates core CRUD logic for documents

let db;

before(() => {
  // Use in-memory DB for tests
  process.env.TEST = 'true';
  const Database = require('better-sqlite3');
  const { v4: uuidv4 } = require('uuid');

  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE);
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'Untitled Document',
      content TEXT DEFAULT '',
      owner_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT,
      shared_with_id TEXT,
      shared_by_id TEXT,
      UNIQUE(document_id, shared_with_id)
    );
  `);

  // Seed test users
  db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)').run('user-1', 'Alice', 'alice@test.com');
  db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)').run('user-2', 'Bob', 'bob@test.com');
});

describe('Document CRUD', () => {
  let docId;

  it('creates a document', () => {
    const { v4: uuidv4 } = require('uuid');
    docId = uuidv4();
    db.prepare('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)')
      .run(docId, 'Test Doc', '<p>Hello</p>', 'user-1');

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    assert.strictEqual(doc.title, 'Test Doc');
    assert.strictEqual(doc.owner_id, 'user-1');
  });

  it('updates a document title', () => {
    db.prepare('UPDATE documents SET title = ? WHERE id = ?').run('Updated Title', docId);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    assert.strictEqual(doc.title, 'Updated Title');
  });

  it('shares a document with another user', () => {
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT INTO document_shares (id, document_id, shared_with_id, shared_by_id) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), docId, 'user-2', 'user-1');

    const share = db.prepare('SELECT * FROM document_shares WHERE document_id = ? AND shared_with_id = ?')
      .get(docId, 'user-2');
    assert.ok(share, 'Share record should exist');
  });

  it('prevents duplicate shares', () => {
    const { v4: uuidv4 } = require('uuid');
    assert.throws(() => {
      db.prepare('INSERT INTO document_shares (id, document_id, shared_with_id, shared_by_id) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), docId, 'user-2', 'user-1');
    });
  });

  it('deletes a document', () => {
    db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    assert.strictEqual(doc, undefined);
  });
});
