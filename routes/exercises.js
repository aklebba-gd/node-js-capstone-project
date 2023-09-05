const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const selectById = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const user = selectById.get(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  if (isNaN(duration) || parseInt(duration) < 0) {
    return res.status(400).json({ error: 'Duration must be a positive integer' });
  }

  let exerciseDate;
  if (date) {
    exerciseDate = new Date(date);
    if (isNaN(exerciseDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    exerciseDate = exerciseDate
      .toLocaleString('en-CA', { timeZone: 'CET' })
      .split(',')[0]
      .replace(/\//g, '-');
  } else {
    exerciseDate = new Date()
      .toLocaleString('en-CA', { timeZone: 'CET' })
      .split(',')[0]
      .replace(/\//g, '-');
  }

  try {
    const insert = db.prepare(
      `INSERT INTO exercises(userId, description, duration, date) VALUES(?, ?, ?, ?)`
    );
    const info = insert.run(_id, description, duration, exerciseDate);

    res.json({
      userId: _id,
      exerciseId: info.lastInsertRowid,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  if (from !== undefined && isNaN(Date.parse(from))) {
    return res.status(400).json({ error: 'from query param is invalid. It must be a date' });
  }
  if (to !== undefined && isNaN(Date.parse(to))) {
    return res.status(400).json({ error: 'to query param is invalid. It must be a date' });
  }
  if (limit !== undefined) {
    if (isNaN(limit) || parseInt(limit) < 0 || limit.trim() === '') {
      return res.status(400).json({ error: 'Limit must be a positive integer' });
    }
  }

  const selectById = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const user = selectById.get(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let sql = `SELECT * FROM exercises WHERE userId = ?`;
  const params = [_id];

  if (from) {
    sql += ` AND date >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND date <= ?`;
    params.push(to);
  }

  sql += ` ORDER BY date`;

  const selectExercises = db.prepare(sql);

  const allExercises = selectExercises.all(...params);

  let exercises;
  if (limit) {
    exercises = allExercises.slice(0, limit);
  } else {
    exercises = allExercises;
  }

  const response = {
    userId: _id,
    username: user.username,
    count: allExercises.length,
    logs: exercises.map((exercise) => ({
      id: exercise.id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.substring(0, 10),
    })),
  };

  res.json(response);
});

module.exports = router;
