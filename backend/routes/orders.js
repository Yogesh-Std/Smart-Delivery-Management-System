const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/', async (req, res) => {
    const { delivery_address, payment_method } = req.body;
    const allowed = ['COD', 'UPI', 'CARD', 'NET_BANKING'];
    if (!delivery_address || !allowed.includes(payment_method)) return res.status(400).json({ message: 'Valid address and payment method are required.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [cart] = await conn.query(
            `SELECT c.product_id, c.quantity, p.name, p.price, p.stock
             FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=? FOR UPDATE`, [req.user.id]
        );
        if (!cart.length) throw new Error('Your cart is empty.');
        for (const item of cart) if (item.quantity > item.stock) throw new Error(`Not enough stock for ${item.name}.`);

        const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        const paymentStatus = payment_method === 'COD' ? 'PENDING' : 'PAID';
        const [orderResult] = await conn.query(
            `INSERT INTO orders (user_id, total_amount, payment_method, payment_status, order_status, delivery_address)
             VALUES (?, ?, ?, ?, 'PLACED', ?)`,
            [req.user.id, total, payment_method, paymentStatus, delivery_address]
        );
        const orderId = orderResult.insertId;

        for (const item of cart) {
            await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
            await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        await conn.query('INSERT INTO payments (order_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?)', [orderId, total, payment_method, payment_method === 'COD' ? null : `DEMO-${Date.now()}`, paymentStatus === 'PAID' ? 'SUCCESS' : 'PENDING']);
        await conn.query('INSERT INTO delivery_tracking (order_id, status, location) VALUES (?, ?, ?)', [orderId, 'PLACED', 'Order Processing Center']);
        await conn.query('DELETE FROM cart WHERE user_id=?', [req.user.id]);
        await conn.commit();
        res.status(201).json({ message: 'Order placed successfully', orderId, total });
    } catch (error) {
        await conn.rollback();
        res.status(400).json({ message: error.message || 'Could not place order.' });
    } finally { conn.release(); }
});

router.get('/', async (req, res) => {
    const [rows] = await pool.query(
        `SELECT o.*, u.name AS customer_name,
                d.name AS delivery_partner_name
         FROM orders o
         JOIN users u ON u.id=o.user_id
         LEFT JOIN users d ON d.id=o.delivery_partner_id
         WHERE o.user_id=? ORDER BY o.created_at DESC`, [req.user.id]
    );
    res.json(rows);
});

router.get('/:id', async (req, res) => {
    const [orders] = await pool.query(
        `SELECT o.*, u.name AS customer_name, d.name AS delivery_partner_name
         FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN users d ON d.id=o.delivery_partner_id
         WHERE o.id=? AND (o.user_id=? OR o.delivery_partner_id=?)`, [req.params.id, req.user.id, req.user.id]
    );
    if (!orders.length && req.user.role !== 'admin') return res.status(404).json({ message: 'Order not found.' });
    const [items] = await pool.query(
        `SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?`, [req.params.id]
    );
    const [tracking] = await pool.query('SELECT * FROM delivery_tracking WHERE order_id=? ORDER BY updated_at ASC, id ASC', [req.params.id]);
    res.json({ order: orders[0], items, tracking });
});

router.get('/admin/all', authorizeRoles('admin'), async (req, res) => {
    const [rows] = await pool.query(
        `SELECT o.*, u.name AS customer_name, d.name AS delivery_partner_name
         FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN users d ON d.id=o.delivery_partner_id
         ORDER BY o.created_at DESC`
    );
    res.json(rows);
});

module.exports = router;
