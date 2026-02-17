const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const dbPath = path.join(process.cwd(), 'backend/data/db.json');

// Shared memory state
let memoryDB = null;

const getDB = () => {
    if (memoryDB) return memoryDB; // Use cached version if it exists

    let db = { users: [], chatRooms: {} };
    try {
        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
    } catch (e) { console.error("DB Read Error", e); }

    if (!db.users) db.users = [];
    if (!db.chatRooms) db.chatRooms = {};

    memoryDB = db; // Cache for future requests in this Lambda execution
    return memoryDB;
};

const saveDB = (data) => {
    memoryDB = data;
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
    } catch (e) { /* Silent fail on Vercel */ }
};

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = getDB();
        if (db.users.find(u => u.email === email)) return res.status(400).json({ message: 'Exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), username, email, password: hashedPassword, role: 'user' };
        db.users.push(newUser);
        saveDB(db);

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET);
        res.status(201).json({ token, user: { id: newUser.id, username, email } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDB();
        const user = db.users.find(u => u.email === email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid' });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- CHAT ROUTES ---
app.get('/api/chat/rooms/:roomId', (req, res) => {
    const db = getDB();
    res.json(db.chatRooms[req.params.roomId] || []);
});

app.post('/api/chat/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    const { username, text } = req.body;
    const db = getDB();

    if (!db.chatRooms[roomId]) db.chatRooms[roomId] = [];

    // Add user message
    const userMsg = { username, text, timestamp: new Date() };
    db.chatRooms[roomId].push(userMsg);

    // Dynamic Chatbot Logic (ZenBot)
    const lowerText = text.toLowerCase();
    let botResponse = null;

    if (lowerText.includes('hello') || lowerText.includes('hi')) {
        botResponse = "Hello! I'm ZenBot. How can I help you today?";
    } else if (lowerText.includes('game')) {
        botResponse = "I love games! You should try 'Space Ranger' or 'Rise of Goku' in our Gaming Hub!";
    } else if (lowerText.includes('market') || lowerText.includes('shop')) {
        botResponse = "Check out the Marketing section for trending products and our EMI calculator!";
    } else if (lowerText.includes('help')) {
        botResponse = "I am ZenBot, your OmniHub assistant. You can create private chat rooms here or explore our games and tools!";
    }

    if (botResponse) {
        db.chatRooms[roomId].push({
            username: '🤖 ZenBot',
            text: botResponse,
            timestamp: new Date()
        });
    }

    saveDB(db);
    res.json({ success: true });
});

module.exports = app;
