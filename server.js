const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'scores.json');

function readScores() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return []; }
}

function writeScores(scores) {
  fs.writeFileSync(DB_FILE, JSON.stringify(scores), 'utf8');
}

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/scores', (_req, res) => {
  const scores = readScores();
  scores.sort((a, b) => a.moves - b.moves || a.seconds - b.seconds);
  res.json(scores.slice(0, 50));
});

app.post('/api/scores', (req, res) => {
  const { name, moves, seconds, date } = req.body || {};
  if (!name || moves == null || seconds == null || !date)
    return res.status(400).json({ error: 'missing fields' });
  const scores = readScores();
  scores.push({ name: String(name).slice(0, 24), moves: +moves, seconds: +seconds, date: String(date) });
  writeScores(scores);
  res.json({ ok: true });
});

app.delete('/api/scores', (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name required' });
  writeScores(readScores().filter(s => s.name !== name));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Spirlini Memory listening on :${PORT}`));
