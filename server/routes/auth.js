const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// ✅ Login Route (already done)
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Missing fields' });

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                location: user.location,
                availability: user.availability,
                profile_photo: user.profile_photo
            }
        });
    });
});


// ✅ Register Route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ error: 'All fields are required' });

    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (results.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const newUser = {
            name,
            email,
            password: hashedPassword,
            location: '',
            profile_photo: '',
            availability: '',
            is_private: false
        };

        db.query('INSERT INTO users SET ?', newUser, (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to register user' });

            res.status(201).json({
                message: 'Registration successful',
                userId: result.insertId
            });
        });
    });
});

module.exports = router;
