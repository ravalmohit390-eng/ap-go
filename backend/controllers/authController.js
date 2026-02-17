const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';


const dbPath = path.join(process.cwd(), 'backend/data/db.json');

const getDB = () => {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error("DB Read Error:", e);
        return { users: [], chatRooms: {} }; // Return empty DB if file is missing
    }
};
const saveDB = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("DB Write Error (Expected on Vercel):", e);
    }
};

exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = getDB();

        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(),
            username,
            email,
            password: hashedPassword,
            role: 'user',
            profile: {
                bio: '',
                avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }
        };

        db.users.push(newUser);
        saveDB(db);

        const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token, user: { id: newUser.id, username, email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ message: 'Error signing up', error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDB();
        const user = db.users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};

exports.getProfile = (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const db = getDB();
        const user = db.users.find(u => u.id === decoded.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, ...userData } = user;
        res.json(userData);
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
