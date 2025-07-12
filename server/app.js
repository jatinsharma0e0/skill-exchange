const express = require('express');
const app = express();
const db = require('./db');

app.get('/', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.send('Database is connected!');
    });
});

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});
