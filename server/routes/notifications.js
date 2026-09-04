const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,title,body,type,data,is_read,created_at
       FROM notifications
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read=true
       WHERE id=$1 AND user_id=$2
       RETURNING id,is_read`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "الإشعار غير موجود" });
    res.json({ notification: rows[0] });
  } catch (e) {
    next(e);
  }
});

router.patch("/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read=true WHERE user_id=$1 AND is_read=false`,
      [req.user.id]
    );
    res.json({ updated: result.rowCount });
  } catch (e) {
    next(e);
  }
});

router.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=false`,
      [req.user.id]
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (e) {
    next(e);
  }
});

router.post("/broadcast", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();
  const audience = String(req.body?.audience || "all").trim();
  if (!title || !body) return res.status(400).json({ error: "اكتب عنوان ونص الإشعار" });
  const allowed = ["all", "customer", "driver", "restaurant", "staff", "admin"];
  if (!allowed.includes(audience)) return res.status(400).json({ error: "الفئة المستهدفة غير صحيحة" });

  try {
    const params = audience === "all" ? [] : [audience];
    const condition = audience === "all" ? "TRUE" : "role=$1";
    const { rows } = await pool.query(
      `INSERT INTO notifications(user_id,title,body,type,data)
       SELECT id,$${params.length + 1},$${params.length + 2},'broadcast',$${params.length + 3}::jsonb
       FROM users WHERE ${condition}
       RETURNING id`,
      [...params, title, body, JSON.stringify({ audience, senderId: req.user.id })]
    );
    res.status(201).json({ sent: rows.length });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
