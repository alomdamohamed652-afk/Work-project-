const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin", "staff"));

router.get("/summary", async (_req, res, next) => {
  try {
    const [orders, drivers] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS orders, COALESCE(SUM(total_amount),0)::numeric AS gross, COALESCE(SUM(delivery_fee),0)::numeric AS delivery_fees FROM orders WHERE status='delivered'`),
      pool.query(`SELECT COUNT(*)::int AS active_drivers, COALESCE(SUM(CASE WHEN role='driver' AND status='active' THEN 1 ELSE 0 END),0)::int AS active FROM users`)
    ]);
    res.json({ summary: { ...orders.rows[0], activeDrivers: drivers.rows[0].active } });
  } catch (e) { next(e); }
});

router.get("/drivers", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id,u.full_name,u.phone,u.status,
        COUNT(o.id)::int AS delivered_orders,
        COALESCE(SUM(o.delivery_fee),0)::numeric AS delivery_earnings,
        COALESCE(SUM(o.total_amount),0)::numeric AS handled_value
      FROM users u
      LEFT JOIN orders o ON o.driver_id=u.id AND o.status='delivered'
      WHERE u.role='driver'
      GROUP BY u.id
      ORDER BY u.full_name
    `);
    res.json({ drivers: rows });
  } catch (e) { next(e); }
});

router.get("/transactions", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id,o.created_at,o.updated_at,o.status,o.total_amount,o.subtotal,o.delivery_fee,
             c.full_name AS customer_name,rp.display_name AS restaurant_name,d.full_name AS driver_name
      FROM orders o
      JOIN users c ON c.id=o.customer_id
      LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=o.restaurant_id
      LEFT JOIN users d ON d.id=o.driver_id
      ORDER BY o.updated_at DESC LIMIT 300
    `);
    res.json({ transactions: rows });
  } catch (e) { next(e); }
});

module.exports = router;
