const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

router.get('/products', (req, res) => {
    const db = getDB();
    res.json(db.products);
});

router.post('/products', (req, res) => {
    const { name, price, category, image, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const db = getDB();
    const newProduct = { id: Date.now(), name, price, category, image };
    db.products.push(newProduct);
    saveDB(db);
    res.status(201).json(newProduct);
});

router.delete('/products/:id', (req, res) => {
    const { role } = req.body;
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const db = getDB();
    db.products = db.products.filter(p => p.id !== parseInt(req.params.id));
    saveDB(db);
    res.json({ message: 'Product deleted' });
});

module.exports = router;
