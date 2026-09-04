const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

function normalizeCode(value) { return String(value || "").trim().toUpperCase(); }
function calculateDiscount(coupon, subtotal) {
  const base = Math.max(0, Number(subtotal) || 0);
  let discount = coupon.discount_type === "percentage" ? base * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  return Math.round(Math.min(base, Math.max(0, discount)) * 100) / 100;
}

router.post("/validate", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    const subtotal = Number(req.body?.subtotal);
    if (!code || !Number.isFinite(subtotal) || subtotal < 0) return res.status(400).json({ error: "بيانات الكوبون غير صحيحة" });
    const { rows } = await pool.query(`SELECT * FROM coupons WHERE code=$1 AND is_active=true`, [code]);
    const coupon = rows[0];
    if (!coupon) return res.status(400).json({ error: "كود الخصم غير صالح" });
    const now = Date.now();
    if (new Date(coupon.starts_at).getTime() > now) return res.status(400).json({ error: "الكود لم يبدأ بعد" });
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) return res.status(400).json({ error: "كود الخصم منتهي" });
    if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) return res.status(400).json({ error: "تم استنفاد استخدامات هذا الكود" });
    if (subtotal < Number(coupon.min_order_amount)) return res.status(400).json({ error: `الحد الأدنى للطلب هو ${Number(coupon.min_order_amount).toFixed(2)}` });
    const used = await pool.query(`SELECT 1 FROM coupon_usages WHERE coupon_id=$1 AND user_id=$2 LIMIT 1`, [coupon.id, req.user.id]);
    if (used.rowCount) return res.status(400).json({ error: "استخدمت هذا الكود من قبل" });
    const discount = calculateDiscount(coupon, subtotal);
    res.json({ coupon: { id: coupon.id, code: coupon.code, discountType: coupon.discount_type, discountValue: Number(coupon.discount_value), minOrderAmount: Number(coupon.min_order_amount), maxDiscount: coupon.max_discount == null ? null : Number(coupon.max_discount) }, discount, subtotal, totalAfterDiscount: Math.max(0, subtotal - discount) });
  } catch (e) { next(e); }
});

router.get("/all", requireAuth, requireRole("admin", "staff"), async (_req, res, next) => {
  try { const { rows } = await pool.query(`SELECT id,code,discount_type,discount_value,min_order_amount,max_discount,usage_limit,used_count,starts_at,expires_at,is_active,created_at,updated_at FROM coupons ORDER BY created_at DESC`); res.json({ coupons: rows }); }
  catch (e) { next(e); }
});

router.post("/", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code), type = String(req.body?.discountType || "").trim();
    const value = Number(req.body?.discountValue), min = Number(req.body?.minOrderAmount || 0);
    const max = req.body?.maxDiscount === "" || req.body?.maxDiscount == null ? null : Number(req.body.maxDiscount);
    const limit = req.body?.usageLimit === "" || req.body?.usageLimit == null ? null : Math.floor(Number(req.body.usageLimit));
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return res.status(400).json({ error: "كود الخصم يجب أن يكون 3-40 حرفًا أو رقمًا" });
    if (!["percentage", "fixed"].includes(type) || !Number.isFinite(value) || value <= 0 || (type === "percentage" && value > 100)) return res.status(400).json({ error: "بيانات الخصم غير صحيحة" });
    if (!Number.isFinite(min) || min < 0 || (max != null && (!Number.isFinite(max) || max < 0)) || (limit != null && (!Number.isFinite(limit) || limit < 1))) return res.status(400).json({ error: "بيانات الحدود غير صحيحة" });
    const { rows } = await pool.query(`INSERT INTO coupons(code,discount_type,discount_value,min_order_amount,max_discount,usage_limit,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [code,type,value,min,max,limit,req.user.id]);
    res.status(201).json({ coupon: rows[0] });
  } catch (e) { if (e.code === "23505") return res.status(409).json({ error: "كود الخصم موجود بالفعل" }); next(e); }
});

router.patch("/:id", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  try {
    const fields = [], values = [];
    const add = (field, value) => { values.push(value); fields.push(`${field}=$${values.length}`); };
    if (req.body?.isActive !== undefined) add("is_active", Boolean(req.body.isActive));
    if (req.body?.expiresAt !== undefined) { const d = req.body.expiresAt ? new Date(req.body.expiresAt) : null; if (d && Number.isNaN(d.getTime())) return res.status(400).json({ error: "تاريخ الانتهاء غير صحيح" }); add("expires_at", d); }
    if (req.body?.minOrderAmount !== undefined) add("min_order_amount", Number(req.body.minOrderAmount));
    if (req.body?.maxDiscount !== undefined) add("max_discount", req.body.maxDiscount === "" || req.body.maxDiscount == null ? null : Number(req.body.maxDiscount));
    if (!fields.length) return res.status(400).json({ error: "لا توجد تعديلات" });
    values.push(req.params.id);
    const { rows } = await pool.query(`UPDATE coupons SET ${fields.join(",")},updated_at=now() WHERE id=$${values.length} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: "الكوبون غير موجود" });
    res.json({ coupon: rows[0] });
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  try { const { rows } = await pool.query(`UPDATE coupons SET is_active=false,updated_at=now() WHERE id=$1 RETURNING id,is_active`, [req.params.id]); if (!rows[0]) return res.status(404).json({ error: "الكوبون غير موجود" }); res.json({ coupon: rows[0] }); }
  catch (e) { next(e); }
});

module.exports = router;
