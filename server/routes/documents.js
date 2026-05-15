const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// GET /api/documents?userId=xxx — get all docs for a user (owned + shared)
router.get('/', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const owned = db.prepare(`
    SELECT d.*, 'owner' as role, u.name as owner_name
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.owner_id = ?
    ORDER BY d.updated_at DESC
  `).all(userId);

  const shared = db.prepare(`
    SELECT d.*, 'shared' as role, u.name as owner_name
    FROM documents d
    JOIN document_shares ds ON ds.document_id = d.id
    JOIN users u ON d.owner_id = u.id
    WHERE ds.shared_with_id = ?
    ORDER BY d.updated_at DESC
  `).all(userId);

  res.json({ owned, shared });
});

// POST /api/documents — create a new document
router.post('/', (req, res) => {
  const { userId, title, content } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)
  `).run(id, title || 'Untitled Document', content || '', userId);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json(doc);
});

// GET /api/documents/:id — get a single document
router.get('/:id', (req, res) => {
  const { userId } = req.query;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Check access
  if (userId) {
    const isOwner = doc.owner_id === userId;
    const isShared = db.prepare(`
      SELECT 1 FROM document_shares WHERE document_id = ? AND shared_with_id = ?
    `).get(req.params.id, userId);
    if (!isOwner && !isShared) return res.status(403).json({ error: 'Access denied' });
  }

  const owner = db.prepare('SELECT name, email FROM users WHERE id = ?').get(doc.owner_id);
  const shares = db.prepare(`
    SELECT u.id, u.name, u.email FROM document_shares ds
    JOIN users u ON ds.shared_with_id = u.id
    WHERE ds.document_id = ?
  `).all(req.params.id);

  res.json({ ...doc, owner, shares });
});

// PUT /api/documents/:id — update title or content
router.put('/:id', (req, res) => {
  const { title, content, userId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Only owner or shared users can edit
  if (userId) {
    const isOwner = doc.owner_id === userId;
    const isShared = db.prepare(`
      SELECT 1 FROM document_shares WHERE document_id = ? AND shared_with_id = ?
    `).get(req.params.id, userId);
    if (!isOwner && !isShared) return res.status(403).json({ error: 'Access denied' });
  }

  const newTitle = title !== undefined ? title : doc.title;
  const newContent = content !== undefined ? content : doc.content;

  db.prepare(`
    UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(newTitle, newContent, req.params.id);

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const { userId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (userId && doc.owner_id !== userId) return res.status(403).json({ error: 'Only owner can delete' });

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/documents/:id/share
router.post('/:id/share', (req, res) => {
  const { ownerId, shareWithId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== ownerId) return res.status(403).json({ error: 'Only owner can share' });
  if (ownerId === shareWithId) return res.status(400).json({ error: 'Cannot share with yourself' });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(shareWithId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare(`
      INSERT INTO document_shares (id, document_id, shared_with_id, shared_by_id)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, shareWithId, ownerId);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Already shared with this user' });
    }
    throw e;
  }

  res.json({ success: true, sharedWith: target });
});

// DELETE /api/documents/:id/share/:userId — revoke access
router.delete('/:id/share/:shareUserId', (req, res) => {
  const { ownerId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== ownerId) return res.status(403).json({ error: 'Only owner can revoke access' });

  db.prepare(`
    DELETE FROM document_shares WHERE document_id = ? AND shared_with_id = ?
  `).run(req.params.id, req.params.shareUserId);

  res.json({ success: true });
});

module.exports = router;
