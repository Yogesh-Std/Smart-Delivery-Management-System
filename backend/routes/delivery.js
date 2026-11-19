const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, authorizeRoles('delivery', 'admin'));

router.get('/orders', async (req, res) => {
    const sql = req.user.role === 'admin'
        ? `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.delivery_partner_id IS NOT NULL ORDER BY o.created_at DESC`
        : `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.delivery_partner_id=? ORDER BY o.created_at DESC`;
    const [rows] = await pool.query(sql, req.user.role === 'admin' ? [] : [req.user.id]);
    res.json(rows);
});

router.put('/orders/:id/status', async (req, res) => {
    const { status, location } = req.body;
    const allowed = ['CONFIRMED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid delivery status.' });

    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];
    const condition = req.user.role === 'admin' ? 'id=?' : 'id=? AND delivery_partner_id=?';
    const [result] = await pool.query(`UPDATE orders SET order_status=? WHERE ${condition}`, [status, ...params]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Delivery not found.' });
    await pool.query('INSERT INTO delivery_tracking (order_id, status, location) VALUES (?, ?, ?)', [req.params.id, status === 'CANCELLED' ? 'CANCELLED' : status, location || 'In transit']);
    res.json({ message: 'Delivery status updated.' });
});

module.exports = router;
