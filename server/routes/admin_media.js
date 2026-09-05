const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin"));

function normalizeImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return url;
  } catch {
    return null;
  }
}

router.patch("/restaurants/:id", async (req, res, next) => {
  try {
    const logoUrl = normalizeImageUrl(req.body?.logoUrl);
    const coverUrl = normalizeImageUrl(req.body?.coverUrl);
    if (req.body?.logoUrl && !logoUrl) return res.status(400).json({ error: "رابط اللوجو غير صحيح" });
    if (req.body?.coverUrl && !coverUrl) return res.status(400).json({ error: "رابط صورة الغلاف غير صحيح" });

    const owner = await pool.query("SELECT id,full_name FROM users WHERE id=$1 AND role='restaurant'", [req.params.id]);
    if (!owner.rows[0]) return res.status(404).json({ error: "المطعم غير موجود" });

    const current = await pool.query("SELECT * FROM restaurant_profiles WHERE restaurant_id=$1", [req.params.id]);
    const existing = current.rows[0];
    await pool.query(`
      INSERT INTO restaurant_profiles(restaurant_id,display_name,logo_url,cover_url)
      VALUES($1,$2,$3,$4)
      ON CONFLICT(restaurant_id) DO UPDATE SET
        logo_url=EXCLUDED.logo_url,
        cover_url=EXCLUDED.cover_url,
        updated_at=now()
    `, [
      req.params.id,
      existing?.display_name || owner.rows[0].full_name,
      req.body?.logoUrl === undefined ? existing?.logo_url || null : logoUrl,
      req.body?.coverUrl === undefined ? existing?.cover_url || null : coverUrl,
    ]);

    const { rows } = await pool.query(`
      SELECT u.id,u.full_name,rp.logo_url,rp.cover_url
      FROM users u LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=u.id
      WHERE u.id=$1
    `, [req.params.id]);
    res.json({ restaurant: rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
