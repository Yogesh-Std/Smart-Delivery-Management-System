const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
        if (password.length < 6) return res.status(400).json({ message: 'Password must contain at least 6 characters.' });

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length) return res.status(409).json({ message: 'Email already registered.' });

        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hash, phone || null, 'customer']
        );
        res.status(201).json({ message: 'Registration successful', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration failed.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

        const [rows] = await pool.query('SELECT id, name, email, password, phone, role FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (!rows.length) return res.status(401).json({ message: 'Invalid email or password.' });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Login failed.' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    const [rows] = await pool.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
});

module.exports = router;
