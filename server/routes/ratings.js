const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth');

function rating(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : NaN;
}

router.get('/restaurant/:restaurantId', requireAuth, async (req, res, next) => {
  try {
    const [summary, reviews] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count,COALESCE(ROUND(AVG(restaurant_rating)::numeric,2),0) AS average FROM order_ratings WHERE restaurant_id=$1 AND restaurant_rating IS NOT NULL`, [req.params.restaurantId]),
      pool.query(`SELECT r.restaurant_rating,r.restaurant_comment,r.created_at,u.full_name AS customer_name FROM order_ratings r JOIN users u ON u.id=r.customer_id WHERE r.restaurant_id=$1 AND r.restaurant_rating IS NOT NULL ORDER BY r.created_at DESC LIMIT 20`, [req.params.restaurantId])
    ]);
    res.json({ summary: summary.rows[0], reviews: reviews.rows });
  } catch (e) { next(e); }
});

router.get('/driver/:driverId', requireAuth, requireRole('admin','staff'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count,COALESCE(ROUND(AVG(driver_rating)::numeric,2),0) AS average FROM order_ratings WHERE driver_id=$1 AND driver_rating IS NOT NULL`, [req.params.driverId]);
    res.json({ summary: rows[0] });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT r.*,COALESCE(rp.display_name,u.full_name) AS restaurant_name,du.full_name AS driver_name FROM order_ratings r JOIN users u ON u.id=r.restaurant_id LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=r.restaurant_id LEFT JOIN users du ON du.id=r.driver_id WHERE r.customer_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json({ ratings: rows });
  } catch (e) { next(e); }
});

router.post('/order/:orderId', requireAuth, requireRole('customer'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const restaurantRating = rating(req.body?.restaurantRating);
    const driverRating = rating(req.body?.driverRating);
    if (Number.isNaN(restaurantRating) || Number.isNaN(driverRating)) return res.status(400).json({ error: 'التقييم يجب أن يكون من 1 إلى 5' });
    if (restaurantRating === null && driverRating === null) return res.status(400).json({ error: 'أدخل تقييمًا واحدًا على الأقل' });
    const restaurantComment = String(req.body?.restaurantComment || '').trim().slice(0, 1000) || null;
    const driverComment = String(req.body?.driverComment || '').trim().slice(0, 1000) || null;
    await client.query('BEGIN');
    const order = await client.query(`SELECT id,customer_id,restaurant_id,driver_id,status FROM orders WHERE id=$1 AND customer_id=$2 FOR UPDATE`, [req.params.orderId, req.user.id]);
    const o = order.rows[0];
    if (!o) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'الطلب غير موجود' }); }
    if (o.status !== 'delivered') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'يمكن تقييم الطلب بعد التسليم فقط' }); }
    if (driverRating !== null && !o.driver_id) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'لا يوجد مندوب مرتبط بهذا الطلب' }); }
    const existing = await client.query('SELECT id FROM order_ratings WHERE order_id=$1', [o.id]);
    if (existing.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'تم تقييم هذا الطلب بالفعل' }); }
    const { rows } = await client.query(`INSERT INTO order_ratings(order_id,customer_id,restaurant_id,driver_id,restaurant_rating,driver_rating,restaurant_comment,driver_comment) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [o.id, o.customer_id, o.restaurant_id, o.driver_id, restaurantRating, driverRating, restaurantComment, driverComment]);
    await client.query('COMMIT');
    res.status(201).json({ rating: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client.release(); }
});

module.exports = router;
