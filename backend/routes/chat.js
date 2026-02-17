const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// Ensure chat exists in DB
const initDB = () => {
    const db = getDB();
    if (!db.chatRooms) db.chatRooms = {};
    saveDB(db);
};
initDB();

router.get('/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const db = getDB();
    res.json(db.chatRooms[roomId] || []);
});

router.post('/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    const { username, text } = req.body;
    const db = getDB();

    if (!db.chatRooms[roomId]) db.chatRooms[roomId] = [];

    const message = {
        id: Date.now(),
        username,
        text,
        timestamp: new Date().toISOString()
    };

    db.chatRooms[roomId].push(message);
    // Keep only last 50 messages
    if (db.chatRooms[roomId].length > 50) db.chatRooms[roomId].shift();

    saveDB(db);
    res.status(201).json(message);
});

module.exports = router;
