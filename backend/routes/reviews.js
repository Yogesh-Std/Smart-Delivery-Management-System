const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
    const [rows] = await pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
         FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.created_at DESC`, [req.params.productId]
    );
    res.json(rows);
});

router.post('/', authenticateToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    if (!product_id || Number(rating) < 1 || Number(rating) > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    await pool.query('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)', [req.user.id, product_id, rating, comment || null]);
    res.status(201).json({ message: 'Review added.' });
});

module.exports = router;
