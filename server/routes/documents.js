const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function saveVersion(docId) {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  if (!doc) return;
  const last = db.prepare('SELECT MAX(version_number) as max FROM document_versions WHERE document_id = ?').get(docId);
  const nextNum = (last.max || 0) + 1;
  db.prepare(`INSERT INTO document_versions (id, document_id, title, content, version_number) VALUES (?, ?, ?, ?, ?)`)
    .run(uuidv4(), docId, doc.title, doc.content, nextNum);
  // Keep only last 20 versions
  const old = db.prepare(`SELECT id FROM document_versions WHERE document_id = ? ORDER BY version_number DESC LIMIT -1 OFFSET 20`).all(docId);
  if (old.length > 0) {
    const ids = old.map(r => r.id);
    db.prepare(`DELETE FROM document_versions WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  }
}

// GET /api/documents?userId=xxx
router.get('/', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const owned = db.prepare(`
    SELECT d.*, 'owner' as role, u.name as owner_name
    FROM documents d JOIN users u ON d.owner_id = u.id
    WHERE d.owner_id = ? ORDER BY d.updated_at DESC
  `).all(userId);

  const shared = db.prepare(`
    SELECT d.*, ds.role as role, u.name as owner_name
    FROM documents d
    JOIN document_shares ds ON ds.document_id = d.id
    JOIN users u ON d.owner_id = u.id
    WHERE ds.shared_with_id = ? ORDER BY d.updated_at DESC
  `).all(userId);

  res.json({ owned, shared });
});

// POST /api/documents
router.post('/', (req, res) => {
  const { userId, title, content } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)`)
    .run(id, title || 'Untitled Document', content || '', userId);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json(doc);
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const { userId } = req.query;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (userId) {
    const isOwner = doc.owner_id === userId;
    const share = db.prepare(`SELECT role FROM document_shares WHERE document_id = ? AND shared_with_id = ?`).get(req.params.id, userId);
    if (!isOwner && !share) return res.status(403).json({ error: 'Access denied' });
    const userRole = isOwner ? 'owner' : share.role;
    const owner = db.prepare('SELECT name, email FROM users WHERE id = ?').get(doc.owner_id);
    const shares = db.prepare(`
      SELECT u.id, u.name, u.email, ds.role FROM document_shares ds
      JOIN users u ON ds.shared_with_id = u.id WHERE ds.document_id = ?
    `).all(req.params.id);
    return res.json({ ...doc, owner, shares, userRole });
  }

  const owner = db.prepare('SELECT name, email FROM users WHERE id = ?').get(doc.owner_id);
  const shares = db.prepare(`
    SELECT u.id, u.name, u.email, ds.role FROM document_shares ds
    JOIN users u ON ds.shared_with_id = u.id WHERE ds.document_id = ?
  `).all(req.params.id);
  res.json({ ...doc, owner, shares, userRole: 'owner' });
});

// PUT /api/documents/:id
router.put('/:id', (req, res) => {
  const { title, content, userId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (userId) {
    const isOwner = doc.owner_id === userId;
    const share = db.prepare(`SELECT role FROM document_shares WHERE document_id = ? AND shared_with_id = ?`).get(req.params.id, userId);
    if (!isOwner && !share) return res.status(403).json({ error: 'Access denied' });
    if (!isOwner && share && share.role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit' });
  }

  saveVersion(req.params.id);

  const newTitle = title !== undefined ? title : doc.title;
  const newContent = content !== undefined ? content : doc.content;
  db.prepare(`UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(newTitle, newContent, req.params.id);

  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
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
  const { ownerId, shareWithId, role = 'editor' } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== ownerId) return res.status(403).json({ error: 'Only owner can share' });
  if (ownerId === shareWithId) return res.status(400).json({ error: 'Cannot share with yourself' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(shareWithId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare(`INSERT INTO document_shares (id, document_id, shared_with_id, shared_by_id, role) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), req.params.id, shareWithId, ownerId, role);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already shared with this user' });
    throw e;
  }
  res.json({ success: true, sharedWith: target });
});

// PATCH /api/documents/:id/share/:shareUserId — update role
router.patch('/:id/share/:shareUserId', (req, res) => {
  const { ownerId, role } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== ownerId) return res.status(403).json({ error: 'Only owner can update roles' });
  db.prepare(`UPDATE document_shares SET role = ? WHERE document_id = ? AND shared_with_id = ?`)
    .run(role, req.params.id, req.params.shareUserId);
  res.json({ success: true });
});

// DELETE /api/documents/:id/share/:shareUserId
router.delete('/:id/share/:shareUserId', (req, res) => {
  const { ownerId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== ownerId) return res.status(403).json({ error: 'Only owner can revoke access' });
  db.prepare(`DELETE FROM document_shares WHERE document_id = ? AND shared_with_id = ?`).run(req.params.id, req.params.shareUserId);
  res.json({ success: true });
});

// GET /api/documents/:id/versions
router.get('/:id/versions', (req, res) => {
  const { userId } = req.query;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (userId) {
    const isOwner = doc.owner_id === userId;
    const share = db.prepare(`SELECT 1 FROM document_shares WHERE document_id = ? AND shared_with_id = ?`).get(req.params.id, userId);
    if (!isOwner && !share) return res.status(403).json({ error: 'Access denied' });
  }
  const versions = db.prepare(`SELECT id, version_number, title, saved_at FROM document_versions WHERE document_id = ? ORDER BY version_number DESC`).all(req.params.id);
  res.json(versions);
});

// POST /api/documents/:id/versions/:versionId/restore
router.post('/:id/versions/:versionId/restore', (req, res) => {
  const { userId } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== userId) return res.status(403).json({ error: 'Only owner can restore versions' });
  const version = db.prepare('SELECT * FROM document_versions WHERE id = ? AND document_id = ?').get(req.params.versionId, req.params.id);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  saveVersion(req.params.id);
  db.prepare(`UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(version.title, version.content, req.params.id);
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
});

module.exports = router;
