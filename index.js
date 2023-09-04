const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const db = new Database('./database.db');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create db structure
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE
)`);

db.exec(`CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
)`);

// Clear sql table
// db.exec(`DELETE FROM exercises;`);
// db.exec(`DELETE FROM users;`);

// POST to /api/users
app.post('/api/users', (req, res) => {
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

// GET all users
app.get('/api/users', (req, res) => {
  try {
    const selectAll = db.prepare(`SELECT * FROM users`);
    const rows = selectAll.all();
    res.json(rows);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST to /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', (req, res) => {
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

// GET a user's full exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  // Check if user exists
  const selectById = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const user = selectById.get(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prepare SQL statement
  let sql = `SELECT * FROM exercises WHERE userId = ?`;
  const params = [_id];

  const allExercises = db.prepare(`SELECT * FROM exercises WHERE userId = ?`).all(...params);

  // Add date filters to SQL statement
  if (from) {
    sql += ` AND date >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND date <= ?`;
    params.push(to);
  }

  // Prepare SQL statement for getting exercises
  const selectExercises = db.prepare(sql);
  const selectedExercises = selectExercises.all(...params);

  // Get all exercises that match the date filters
  console.log(allExercises);

  // Limit the number of exercises returned in the response
  let exercises;
  if (limit) {
    exercises = selectedExercises.slice(0, limit);
  } else {
    exercises = selectedExercises;
  }

  // Prepare response
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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
