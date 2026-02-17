const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes (to be implemented)
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const shopRoutes = require('./routes/shop');
const toolRoutes = require('./routes/tools');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/chat', chatRoutes);

// Fallback for SPA or 404 (Only for local dev, Vercel handles this via vercel.json)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
    });
}

// Export for Vercel
module.exports = app;

// Only listen if run directly (local development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
