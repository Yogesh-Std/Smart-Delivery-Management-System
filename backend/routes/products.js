const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const category = (req.query.category || '').trim();
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        if (search) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (category) { sql += ' AND category = ?'; params.push(category); }
        sql += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: 'Could not load products.' }); }
});

router.get('/:id', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found.' });
    res.json(rows[0]);
});

router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { name, description, price, category, stock, image } = req.body;
    if (!name || price === undefined || !category) return res.status(400).json({ message: 'Name, price and category are required.' });
    const [result] = await pool.query(
        'INSERT INTO products (name, description, price, category, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description || null, Number(price), category, Number(stock || 0), image || null]
    );
    res.status(201).json({ message: 'Product created', id: result.insertId });
});

router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { name, description, price, category, stock, image } = req.body;
    await pool.query(
        'UPDATE products SET name=?, description=?, price=?, category=?, stock=?, image=? WHERE id=?',
        [name, description || null, Number(price), category, Number(stock), image || null, req.params.id]
    );
    res.json({ message: 'Product updated' });
});

router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
});

module.exports = router;
