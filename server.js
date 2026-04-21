const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// ── Storage: Postgres when DATABASE_URL is set, JSON file otherwise ──

let db;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  db = {
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS scores (
        id      SERIAL  PRIMARY KEY,
        name    TEXT    NOT NULL,
        moves   INTEGER NOT NULL,
        seconds INTEGER NOT NULL,
        date    TEXT    NOT NULL
      )`);
    },
    async getAll() {
      const { rows } = await pool.query(
        'SELECT name, moves, seconds, date FROM scores ORDER BY moves ASC, seconds ASC LIMIT 50'
      );
      return rows;
    },
    async insert(name, moves, seconds, date) {
      await pool.query(
        'INSERT INTO scores (name, moves, seconds, date) VALUES ($1, $2, $3, $4)',
        [name, moves, seconds, date]
      );
    },
    async deleteByName(name) {
      await pool.query('DELETE FROM scores WHERE name = $1', [name]);
    },
  };
  console.log('Storage: PostgreSQL');
} else {
  const DB_FILE = path.join(__dirname, 'scores.json');
  const read  = () => { try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return []; } };
  const write = d => fs.writeFileSync(DB_FILE, JSON.stringify(d), 'utf8');

  db = {
    async init() {},
    async getAll() {
      return read().sort((a, b) => a.moves - b.moves || a.seconds - b.seconds).slice(0, 50);
    },
    async insert(name, moves, seconds, date) {
      const scores = read();
      scores.push({ name, moves, seconds, date });
      write(scores);
    },
    async deleteByName(name) {
      write(read().filter(s => s.name !== name));
    },
  };
  console.log('Storage: JSON file (set DATABASE_URL to use PostgreSQL)');
}

// ── Routes ──

app.get('/api/scores', async (_req, res) => {
  res.json(await db.getAll());
});

app.post('/api/scores', async (req, res) => {
  const { name, moves, seconds, date } = req.body || {};
  if (!name || moves == null || seconds == null || !date)
    return res.status(400).json({ error: 'missing fields' });
  await db.insert(String(name).slice(0, 24), +moves, +seconds, String(date));
  res.json({ ok: true });
});

app.delete('/api/scores', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name required' });
  await db.deleteByName(name);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
db.init().then(() => app.listen(PORT, () => console.log(`Spirlini Memory listening on :${PORT}`)));
