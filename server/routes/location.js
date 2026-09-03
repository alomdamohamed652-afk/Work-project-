const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

function validCoordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

router.post("/me", requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, heading, speed } = req.body || {};
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({ error: "موقع GPS غير صحيح" });
    }

    await pool.query(
      `INSERT INTO user_locations (user_id, latitude, longitude, accuracy, heading, speed, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT (user_id) DO UPDATE SET latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
       accuracy=EXCLUDED.accuracy, heading=EXCLUDED.heading, speed=EXCLUDED.speed, updated_at=now()`,
      [req.user.id, Number(latitude), Number(longitude), accuracy == null ? null : Number(accuracy), heading == null ? null : Number(heading), speed == null ? null : Number(speed)]
    );

    await pool.query(
      "INSERT INTO location_history (user_id, latitude, longitude, accuracy, heading, speed) VALUES ($1,$2,$3,$4,$5,$6)",
      [req.user.id, Number(latitude), Number(longitude), accuracy == null ? null : Number(accuracy), heading == null ? null : Number(heading), speed == null ? null : Number(speed)]
    );

    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get("/drivers", requireAuth, requireRole("admin", "staff"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.status, l.latitude, l.longitude, l.accuracy, l.heading, l.speed, l.updated_at
       FROM users u LEFT JOIN user_locations l ON l.user_id=u.id
       WHERE u.role='driver' AND u.status='active'
       ORDER BY l.updated_at DESC NULLS LAST`
    );
    res.json({ drivers: rows });
  } catch (error) { next(error); }
});

router.get("/my-driver", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id AS order_id, o.status, u.id AS driver_id, u.full_name, u.phone,
              l.latitude, l.longitude, l.accuracy, l.heading, l.speed, l.updated_at
       FROM orders o
       JOIN users u ON u.id = o.driver_id AND u.role = 'driver'
       LEFT JOIN user_locations l ON l.user_id = u.id
       WHERE o.customer_id = $1
         AND o.driver_id IS NOT NULL
         AND o.status IN ('assigned','picked_up','on_the_way')
       ORDER BY o.updated_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    res.json({ driver: rows[0] || null });
  } catch (error) { next(error); }
});

router.get("/drivers/:id", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.status, l.latitude, l.longitude, l.accuracy, l.heading, l.speed, l.updated_at
       FROM users u LEFT JOIN user_locations l ON l.user_id=u.id WHERE u.id=$1 AND u.role='driver'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "المندوب غير موجود" });
    res.json({ driver: rows[0] });
  } catch (error) { next(error); }
});

router.get("/history/:id", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT latitude, longitude, accuracy, heading, speed, created_at FROM location_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1000",
      [req.params.id]
    );
    res.json({ locations: rows });
  } catch (error) { next(error); }
});

module.exports = router;
