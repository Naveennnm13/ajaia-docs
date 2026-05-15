const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users — list all users
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
});

module.exports = router;
