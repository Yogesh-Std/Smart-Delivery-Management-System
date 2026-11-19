const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/dashboard', async (req, res) => {
    const [[users]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[products]] = await pool.query('SELECT COUNT(*) AS total FROM products');
    const [[orders]] = await pool.query('SELECT COUNT(*) AS total FROM orders');
    const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE payment_status='PAID'");
    res.json({ users: users.total, products: products.total, orders: orders.total, revenue: revenue.total });
});

router.get('/users', async (req, res) => {
    const [rows] = await pool.query('SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
});

router.put('/users/:id/role', async (req, res) => {
    const { role } = req.body;
    if (!['customer', 'delivery', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    await pool.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ message: 'Role updated.' });
});

router.put('/orders/:id/assign', async (req, res) => {
    const { delivery_partner_id } = req.body;
    const [users] = await pool.query("SELECT id FROM users WHERE id=? AND role='delivery'", [delivery_partner_id]);
    if (!users.length) return res.status(400).json({ message: 'Invalid delivery partner.' });
    await pool.query("UPDATE orders SET delivery_partner_id=?, order_status='CONFIRMED' WHERE id=?", [delivery_partner_id, req.params.id]);
    await pool.query('INSERT INTO delivery_tracking (order_id, status, location) VALUES (?, ?, ?)', [req.params.id, 'CONFIRMED', 'Assigned to delivery partner']);
    res.json({ message: 'Delivery partner assigned.' });
});

router.get('/delivery-partners', async (req, res) => {
    const [rows] = await pool.query("SELECT id,name,email,phone FROM users WHERE role='delivery' ORDER BY name");
    res.json(rows);
});

module.exports = router;
