const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

router.get('/leaderboard', (req, res) => {
    const db = getDB();
    res.json(db.leaderboard);
});

router.post('/score', (req, res) => {
    const { username, game, score } = req.body;
    const db = getDB();
    db.leaderboard.push({ username, game, score, date: new Date().toISOString() });
    db.leaderboard.sort((a, b) => b.score - a.score);
    db.leaderboard = db.leaderboard.slice(0, 10); // Keep top 10
    saveDB(db);
    res.status(201).json({ message: 'Score saved' });
});

module.exports = router;
