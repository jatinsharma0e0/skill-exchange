const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db'); // for testing db connection only

const skillRoutes = require('./routes/skills');
const authRoutes = require('./routes/auth');
const swapRoutes = require('./routes/swaps');

app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.static('../')); // Serve static files from root directory

// Mount routes
app.use('/api/skills', skillRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/swaps', swapRoutes);

// DB test route
app.get('/', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.send('Database is connected!');
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
