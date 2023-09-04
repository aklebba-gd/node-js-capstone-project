const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/api/users', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const insert = db.prepare(`INSERT INTO users(username) VALUES(?)`);
    const info = insert.run(username);
    res.json({ username, id: info.lastInsertRowid });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/api/users', (req, res) => {
  try {
    const selectAll = db.prepare(`SELECT * FROM users`);
    const rows = selectAll.all();
    res.json(rows);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
