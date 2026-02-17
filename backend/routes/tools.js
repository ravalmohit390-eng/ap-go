const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

router.get('/tasks', (req, res) => {
    const db = getDB();
    res.json(db.tasks);
});

router.post('/tasks', (req, res) => {
    const { title, completed } = req.body;
    const db = getDB();
    const newTask = { id: Date.now(), title, completed: completed || false };
    db.tasks.push(newTask);
    saveDB(db);
    res.status(201).json(newTask);
});

router.get('/notes', (req, res) => {
    const db = getDB();
    res.json(db.notes);
});

router.post('/notes', (req, res) => {
    const { content } = req.body;
    const db = getDB();
    const newNote = { id: Date.now(), content, date: new Date().toISOString() };
    db.notes.push(newNote);
    saveDB(db);
    res.status(201).json(newNote);
});

module.exports = router;
