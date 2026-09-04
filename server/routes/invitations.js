const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin"));

function makeCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

router.get("/", async (_req, res, next) => {
  try {
    await pool.query("UPDATE invitations SET status='expired' WHERE status='pending' AND expires_at <= now()");
    const { rows } = await pool.query(`
      SELECT i.*, u.full_name AS invited_by_name, used.full_name AS used_by_name
      FROM invitations i
      LEFT JOIN users u ON u.id=i.invited_by
      LEFT JOIN users used ON used.id=i.used_by
      ORDER BY i.created_at DESC LIMIT 200
    `);
    res.json({ invitations: rows });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const role = String(req.body?.role || "");
    if (!["driver", "restaurant", "staff"].includes(role)) return res.status(400).json({ error: "نوع الدعوة غير صحيح" });
    const name = String(req.body?.name || "").trim() || null;
    const phone = String(req.body?.phone || "").replace(/[\s-]/g, "") || null;
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    const restaurantName = req.body?.restaurantName ? String(req.body.restaurantName).trim() : null;
    const days = Math.min(Math.max(Number(req.body?.days || 7), 1), 30);
    const code = makeCode();
    const { rows } = await pool.query(`
      INSERT INTO invitations (code, invited_role, invitee_name, phone, email, restaurant_name, invited_by, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now() + ($8 * interval '1 day')) RETURNING *
    `, [code, role, name, phone, email, restaurantName, req.user.id, days]);
    await pool.query(`INSERT INTO audit_logs (actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'invitation.created','invitation',$2,$3)`, [req.user.id, "" + rows[0].id, JSON.stringify({ role, phone, email })]);
    res.status(201).json({ invitation: rows[0] });
  } catch (error) { next(error); }
});

router.patch("/:id/revoke", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`UPDATE invitations SET status='revoked' WHERE id=$1 AND status='pending' RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "الدعوة غير متاحة" });
    res.json({ invitation: rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
