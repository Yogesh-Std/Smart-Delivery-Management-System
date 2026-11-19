const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    const [rows] = await pool.query(
        `SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image, p.stock,
                (c.quantity * p.price) AS subtotal
         FROM cart c JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ? ORDER BY c.id DESC`, [req.user.id]
    );
    res.json(rows);
});

router.post('/', async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    const qty = Number(quantity);
    if (!product_id || qty < 1) return res.status(400).json({ message: 'Invalid product or quantity.' });

    const [products] = await pool.query('SELECT id, stock FROM products WHERE id = ?', [product_id]);
    if (!products.length) return res.status(404).json({ message: 'Product not found.' });
    if (products[0].stock < qty) return res.status(400).json({ message: 'Not enough stock.' });

    await pool.query(
        `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [req.user.id, product_id, qty]
    );
    res.status(201).json({ message: 'Added to cart.' });
});

router.put('/:id', async (req, res) => {
    const qty = Number(req.body.quantity);
    if (qty < 1) return res.status(400).json({ message: 'Quantity must be at least 1.' });
    const [result] = await pool.query('UPDATE cart SET quantity=? WHERE id=? AND user_id=?', [qty, req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Cart item not found.' });
    res.json({ message: 'Cart updated.' });
});

router.delete('/:id', async (req, res) => {
    const [result] = await pool.query('DELETE FROM cart WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Cart item not found.' });
    res.json({ message: 'Item removed.' });
});

module.exports = router;
