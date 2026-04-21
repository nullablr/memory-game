const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS scores (
    id      SERIAL PRIMARY KEY,
    name    TEXT    NOT NULL,
    moves   INTEGER NOT NULL,
    seconds INTEGER NOT NULL,
    date    TEXT    NOT NULL
  )`);
}

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/scores', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT name, moves, seconds, date FROM scores ORDER BY moves ASC, seconds ASC LIMIT 50'
  );
  res.json(rows);
});

app.post('/api/scores', async (req, res) => {
  const { name, moves, seconds, date } = req.body || {};
  if (!name || moves == null || seconds == null || !date)
    return res.status(400).json({ error: 'missing fields' });
  await pool.query(
    'INSERT INTO scores (name, moves, seconds, date) VALUES ($1, $2, $3, $4)',
    [String(name).slice(0, 24), +moves, +seconds, String(date)]
  );
  res.json({ ok: true });
});

app.delete('/api/scores', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name required' });
  await pool.query('DELETE FROM scores WHERE name = $1', [name]);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
init().then(() => app.listen(PORT, () => console.log(`Spirlini Memory listening on :${PORT}`)));
