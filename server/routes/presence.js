const express = require('express');
const router = express.Router();

// In-memory presence: { docId: { userId: { name, lastSeen } } }
const presence = {};

const TIMEOUT_MS = 20000; // 20 seconds

function cleanStale(docId) {
  if (!presence[docId]) return;
  const now = Date.now();
  for (const uid of Object.keys(presence[docId])) {
    if (now - presence[docId][uid].lastSeen > TIMEOUT_MS) {
      delete presence[docId][uid];
    }
  }
  if (Object.keys(presence[docId]).length === 0) delete presence[docId];
}

// POST /api/presence/:docId — heartbeat
router.post('/:docId', (req, res) => {
  const { userId, userName } = req.body;
  if (!userId || !userName) return res.status(400).json({ error: 'userId and userName required' });
  if (!presence[req.params.docId]) presence[req.params.docId] = {};
  presence[req.params.docId][userId] = { name: userName, lastSeen: Date.now() };
  res.json({ success: true });
});

// GET /api/presence/:docId — get active viewers
router.get('/:docId', (req, res) => {
  cleanStale(req.params.docId);
  const viewers = presence[req.params.docId]
    ? Object.entries(presence[req.params.docId]).map(([id, v]) => ({ id, name: v.name }))
    : [];
  res.json(viewers);
});

// DELETE /api/presence/:docId — leave
router.delete('/:docId', (req, res) => {
  const { userId } = req.body;
  if (presence[req.params.docId] && userId) {
    delete presence[req.params.docId][userId];
  }
  res.json({ success: true });
});

module.exports = router;
