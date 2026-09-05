const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.get("/", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const q = String(req.query?.q || "").trim();
    const params = [];
    let where = "u.role='restaurant' AND u.status='active'";
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (u.full_name ILIKE $${params.length} OR COALESCE(rp.display_name,'') ILIKE $${params.length} OR COALESCE(u.area,'') ILIKE $${params.length} OR COALESCE(u.address,'') ILIKE $${params.length})`;
    }
    const { rows } = await pool.query(
      `SELECT u.id, COALESCE(rp.display_name,u.full_name) AS name, u.phone,
              COALESCE(rp.area,u.area) AS area, COALESCE(rp.address,u.address) AS address,
              rp.logo_url, rp.cover_url, rp.minimum_order, rp.is_open, rp.is_featured,
              l.latitude, l.longitude, l.updated_at AS location_updated_at
       FROM users u
       LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=u.id
       LEFT JOIN user_locations l ON l.user_id=u.id
       WHERE ${where}
       ORDER BY COALESCE(rp.is_featured,false) DESC, COALESCE(rp.display_name,u.full_name) ASC
       LIMIT 100`,
      params
    );
    res.json({ restaurants: rows });
  } catch (error) { next(error); }
});

module.exports = router;
