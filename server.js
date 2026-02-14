const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

// Pulls from Render Env Var, falls back to local file for desktop testing
const dbPath = process.env.SQLITE_PATH || './clicks.db';
const db = new Database(dbPath);

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS item_clicks (
    item_uid TEXT PRIMARY KEY,
    click_count INTEGER DEFAULT 0
  )
`);

// Prepared statements (Pre-compiling saves CPU)
const getCountsStmt = db.prepare('SELECT item_uid, click_count FROM item_clicks');
const incrementStmt = db.prepare(`
  INSERT INTO item_clicks (item_uid, click_count) 
  VALUES (?, 1) 
  ON CONFLICT(item_uid) DO UPDATE SET click_count = click_count + 1
`);

// 1. Fetch all counts
app.get('/api/counts', (req, res) => {
    try {
        const rows = getCountsStmt.all();
        const countsMap = {};
        rows.forEach(row => { countsMap[row.item_uid] = row.click_count; });
        res.json(countsMap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Increment count (Fire & Forget)
app.post('/api/click/:uid', (req, res) => {
    try {
        incrementStmt.run(req.params.uid);
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Err');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Lightweight stats server running on port ${port}`));
