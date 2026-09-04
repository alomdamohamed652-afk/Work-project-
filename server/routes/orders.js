const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

const activeDeliveryStatuses = ["assigned", "picked_up", "on_the_way"];

function validCoordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

router.post("/", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const b = req.body || {};
    const hasLatitude = b.deliveryLatitude !== undefined && b.deliveryLatitude !== null && b.deliveryLatitude !== "";
    const hasLongitude = b.deliveryLongitude !== undefined && b.deliveryLongitude !== null && b.deliveryLongitude !== "";
    const hasCoordinates = hasLatitude && hasLongitude;
    if (hasCoordinates && (!validCoordinate(b.deliveryLatitude, -90, 90) || !validCoordinate(b.deliveryLongitude, -180, 180))) {
      return res.status(400).json({ error: "إحداثيات موقع التوصيل غير صحيحة" });
    }
    const deliveryAddress = b.deliveryAddress ? String(b.deliveryAddress).trim() : "";
    if (!deliveryAddress && !hasCoordinates) {
      return res.status(400).json({ error: "اكتب عنوان التوصيل أو حدد موقعك على الخريطة" });
    }
    const total = Number(b.totalAmount || 0);
    if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: "إجمالي الطلب غير صحيح" });

    const { rows } = await pool.query(
      `INSERT INTO orders
        (customer_id, restaurant_id, status, delivery_latitude, delivery_longitude, delivery_address, total_amount)
       VALUES ($1,$2,CASE WHEN $2 IS NULL THEN 'pending' ELSE 'restaurant_pending' END,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.user.id,
        b.restaurantId || null,
        hasCoordinates ? Number(b.deliveryLatitude) : null,
        hasCoordinates ? Number(b.deliveryLongitude) : null,
        deliveryAddress || null,
        total
      ]
    );
    res.status(201).json({ order: rows[0] });
  } catch (error) { next(error); }
});


// Restaurant/Admin workflow: both may decide; admin can override restaurant when needed.
router.patch("/:id/restaurant-decision", requireAuth, requireRole("restaurant","admin","staff"), async (req,res,next)=>{
 try{
  const approve=Boolean(req.body?.approve), reason=String(req.body?.reason||"").trim();
  if(!approve&&!reason) return res.status(400).json({error:"اكتب سبب الرفض"});
  const where=req.user.role==="restaurant" ? "restaurant_id=$2" : "TRUE";
  const q=approve
   ? `UPDATE orders SET status='confirmed',updated_at=now() WHERE id=$1 AND ${where} AND status='restaurant_pending' RETURNING *`
   : `UPDATE orders SET status='restaurant_rejected',restaurant_rejection_reason=$3,updated_at=now() WHERE id=$1 AND ${where} AND status='restaurant_pending' RETURNING *`;
  const params=req.user.role==="restaurant"?[req.params.id,req.user.id,reason]:[req.params.id,null,reason];
  const {rows}=await pool.query(q,params); if(!rows[0]) return res.status(404).json({error:"الطلب غير متاح لاتخاذ القرار"}); res.json({order:rows[0]});
 }catch(e){next(e)}
});

router.patch("/:id/admin-decision", requireAuth, requireRole("admin","staff"), async(req,res,next)=>{
 try{
  const approve=Boolean(req.body?.approve),reason=String(req.body?.reason||"").trim();
  if(!approve&&!reason)return res.status(400).json({error:"اكتب سبب الرفض"});
  const {rows}=await pool.query(approve
   ? `UPDATE orders SET status='confirmed',updated_at=now() WHERE id=$1 AND status IN ('pending','restaurant_pending') RETURNING *`
   : `UPDATE orders SET status='admin_rejected',admin_rejection_reason=$2,updated_at=now() WHERE id=$1 AND status NOT IN ('delivered','cancelled') RETURNING *`,
   approve?[req.params.id]:[req.params.id,reason]);
  if(!rows[0])return res.status(404).json({error:"الطلب غير متاح"});res.json({order:rows[0]});
 }catch(e){next(e)}
});

router.patch("/:id/cancel", requireAuth, requireRole("admin","staff","restaurant","customer"), async(req,res,next)=>{
 try{const reason=String(req.body?.reason||"").trim();if(!reason)return res.status(400).json({error:"اكتب سبب الإلغاء"});
 const {rows}=await pool.query(`UPDATE orders SET status='cancelled',cancelled_by=$1,cancellation_reason=$2,updated_at=now() WHERE id=$3 AND status NOT IN ('delivered','cancelled') RETURNING *`,[req.user.id,reason,req.params.id]);
 if(!rows[0])return res.status(404).json({error:"الطلب غير متاح للإلغاء"});res.json({order:rows[0]});}catch(e){next(e)}});

router.get("/mine", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, u.full_name AS driver_name, u.phone AS driver_phone,
              l.latitude AS driver_latitude, l.longitude AS driver_longitude,
              l.accuracy AS driver_accuracy, l.heading AS driver_heading,
              l.speed AS driver_speed, l.updated_at AS driver_location_updated_at
       FROM orders o
       LEFT JOIN users u ON u.id=o.driver_id
       LEFT JOIN user_locations l ON l.user_id=o.driver_id
       WHERE o.customer_id=$1
       ORDER BY o.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});


// Orders that are ready for any online/in-service driver to claim.
router.get("/driver/available", requireAuth, requireRole("driver"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.restaurant_id, o.delivery_latitude, o.delivery_longitude,
              o.delivery_address, o.total_amount, o.created_at, o.updated_at,
              c.full_name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN users c ON c.id=o.customer_id
       WHERE o.driver_id IS NULL AND o.status IN ('confirmed','preparing','ready')
       ORDER BY o.created_at ASC LIMIT 100`
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});

// Atomic claim: only one driver can win when several swipe at the same time.
router.patch("/:id/claim", requireAuth, requireRole("driver"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE orders
       SET driver_id=$1, status='assigned', updated_at=now()
       WHERE id=$2 AND driver_id IS NULL AND status IN ('confirmed','preparing','ready')
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(409).json({ error: "الطلب تم استلامه بالفعل أو لم يعد متاحًا" });
    res.json({ order: rows[0] });
  } catch (error) { next(error); }
});

router.get("/driver/mine", requireAuth, requireRole("driver"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.delivery_latitude, o.delivery_longitude,
              o.delivery_address, o.total_amount, o.created_at, o.updated_at,
              c.full_name AS customer_name, c.phone AS customer_phone,
              c.secondary_phone AS customer_secondary_phone
       FROM orders o JOIN users c ON c.id=o.customer_id
       WHERE o.driver_id=$1 AND o.status IN ('assigned','picked_up','on_the_way')
       ORDER BY o.updated_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});

router.get("/admin", requireAuth, requireRole("admin", "staff"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone,
              d.full_name AS driver_name, d.phone AS driver_phone
       FROM orders o
       JOIN users c ON c.id=o.customer_id
       LEFT JOIN users d ON d.id=o.driver_id
       ORDER BY o.updated_at DESC LIMIT 200`
    );
    res.json({ orders: rows });
  } catch (error) { next(error); }
});

router.patch("/:id/assign", requireAuth, requireRole("admin", "staff"), async (req, res, next) => {
  try {
    const driverId = String(req.body?.driverId || "");
    const driver = await pool.query("SELECT id FROM users WHERE id=$1 AND role='driver' AND status='active'", [driverId]);
    if (!driver.rows[0]) return res.status(400).json({ error: "المندوب غير موجود أو غير نشط" });

    const { rows } = await pool.query(
      `UPDATE orders SET driver_id=$1, status='assigned', updated_at=now()
       WHERE id=$2 AND status NOT IN ('delivered','cancelled')
       RETURNING *`,
      [driverId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "الطلب غير موجود أو مغلق" });
    res.json({ order: rows[0] });
  } catch (error) { next(error); }
});

router.patch("/:id/status", requireAuth, requireRole("driver"), async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!activeDeliveryStatuses.includes(status) && status !== "delivered") {
      return res.status(400).json({ error: "حالة الطلب غير صحيحة" });
    }
    const { rows } = await pool.query(
      `UPDATE orders SET status=$1, updated_at=now()
       WHERE id=$2 AND driver_id=$3 AND status NOT IN ('delivered','cancelled')
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "الطلب غير موجود أو غير مسند إليك" });
    res.json({ order: rows[0] });
  } catch (error) { next(error); }
});
