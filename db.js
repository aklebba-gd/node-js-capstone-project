const Database = require('better-sqlite3');
const db = new Database('./database.db');

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
// Clear sql tables
// db.exec(`DROP TABLE IF EXISTS exercises;`);
// db.exec(`DROP TABLE IF EXISTS users;`);

module.exports = db;
