const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("customer"));

function coord(v, min, max) { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max; }

router.get("/profile", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id,u.full_name,u.phone,u.secondary_phone,u.email,u.area,u.address,u.building,u.floor,u.apartment,u.address_notes,
      (SELECT COUNT(*)::int FROM customer_saved_locations l WHERE l.user_id=u.id) AS saved_locations_count
      FROM users u WHERE u.id=$1`, [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "العميل غير موجود" });
    res.json({ profile: rows[0] });
  } catch (e) { next(e); }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const b = req.body || {};
    const fullName = String(b.fullName ?? "").trim();
    const secondaryPhone = String(b.secondaryPhone ?? "").replace(/[\s-]/g, "");
    if (fullName.length < 2) return res.status(400).json({ error: "اكتب الاسم بالكامل" });
    if (secondaryPhone && !/^01\d{9}$/.test(secondaryPhone)) return res.status(400).json({ error: "رقم الهاتف الاحتياطي غير صحيح" });
    const { rows } = await pool.query(`UPDATE users SET full_name=$1,secondary_phone=$2,email=$3,area=$4,address=$5,building=$6,floor=$7,apartment=$8,address_notes=$9,updated_at=now() WHERE id=$10 RETURNING id,full_name,phone,secondary_phone,email,area,address,building,floor,apartment,address_notes,updated_at`, [
      fullName, secondaryPhone || null, b.email ? String(b.email).trim().toLowerCase() : null,
      b.area ? String(b.area).trim() : null, b.address ? String(b.address).trim() : null,
      b.building ? String(b.building).trim() : null, b.floor ? String(b.floor).trim() : null,
      b.apartment ? String(b.apartment).trim() : null, b.addressNotes ? String(b.addressNotes).trim() : null, req.user.id
    ]);
    res.json({ profile: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    next(e);
  }
});

router.get("/locations", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id,label,address,area,building,floor,apartment,notes,latitude,longitude,accuracy,is_default,created_at,updated_at FROM customer_saved_locations WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC`, [req.user.id]);
    res.json({ locations: rows, count: rows.length, max: 10 });
  } catch (e) { next(e); }
});

router.post("/locations", async (req, res, next) => {
  const b = req.body || {};
  const label = String(b.label || "").trim();
  if (!label) return res.status(400).json({ error: "اكتب اسم الموقع مثل البيت أو الشغل" });
  if (b.latitude != null && b.longitude != null && (!coord(b.latitude,-90,90) || !coord(b.longitude,-180,180))) return res.status(400).json({ error: "إحداثيات الموقع غير صحيحة" });
  try {
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM customer_saved_locations WHERE user_id=$1", [req.user.id]);
    if (count.rows[0].count >= 10) return res.status(400).json({ error: "وصلت للحد الأقصى: 10 مواقع محفوظة" });
    const isDefault = Boolean(b.isDefault) || count.rows[0].count === 0;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isDefault) await client.query("UPDATE customer_saved_locations SET is_default=false,updated_at=now() WHERE user_id=$1", [req.user.id]);
      const { rows } = await client.query(`INSERT INTO customer_saved_locations(user_id,label,address,area,building,floor,apartment,notes,latitude,longitude,accuracy,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [
        req.user.id,label,b.address?String(b.address).trim():null,b.area?String(b.area).trim():null,b.building?String(b.building).trim():null,b.floor?String(b.floor).trim():null,b.apartment?String(b.apartment).trim():null,b.notes?String(b.notes).trim():null,
        b.latitude == null ? null : Number(b.latitude),b.longitude == null ? null : Number(b.longitude),b.accuracy == null ? null : Number(b.accuracy),isDefault
      ]);
      await client.query("COMMIT"); res.status(201).json({ location: rows[0] });
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  } catch (e) { next(e); }
});

router.patch("/locations/:id", async (req, res, next) => {
  try {
    const b=req.body||{}, fields=[], values=[];
    const add=(column,value)=>{values.push(value);fields.push(`${column}=$${values.length}`)};
    if(b.label!==undefined){const v=String(b.label).trim();if(!v)return res.status(400).json({error:"اسم الموقع مطلوب"});add("label",v)}
    for(const [key,column] of [["address","address"],["area","area"],["building","building"],["floor","floor"],["apartment","apartment"],["notes","notes"]]) if(b[key]!==undefined)add(column,b[key]?String(b[key]).trim():null);
    if(b.latitude!==undefined)add("latitude",b.latitude==null?null:Number(b.latitude)); if(b.longitude!==undefined)add("longitude",b.longitude==null?null:Number(b.longitude)); if(b.accuracy!==undefined)add("accuracy",b.accuracy==null?null:Number(b.accuracy));
    if(!fields.length && b.isDefault===undefined)return res.status(400).json({error:"لا توجد تعديلات"});
    const client=await pool.connect();try{await client.query("BEGIN");if(b.isDefault){await client.query("UPDATE customer_saved_locations SET is_default=false,updated_at=now() WHERE user_id=$1",[req.user.id]);add("is_default",true)}if(!fields.length)add("updated_at","now()") ;else fields.push("updated_at=now()");values.push(req.params.id,req.user.id);const {rows}=await client.query(`UPDATE customer_saved_locations SET ${fields.join(",")} WHERE id=$${values.length-1} AND user_id=$${values.length} RETURNING *`,values);if(!rows[0]){await client.query("ROLLBACK");return res.status(404).json({error:"الموقع غير موجود"})}await client.query("COMMIT");res.json({location:rows[0]})}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
  } catch(e){next(e)}
});

router.delete("/locations/:id", async (req,res,next)=>{try{const {rows}=await pool.query("DELETE FROM customer_saved_locations WHERE id=$1 AND user_id=$2 RETURNING id,is_default",[req.params.id,req.user.id]);if(!rows[0])return res.status(404).json({error:"الموقع غير موجود"});if(rows[0].is_default)await pool.query("UPDATE customer_saved_locations SET is_default=true WHERE id=(SELECT id FROM customer_saved_locations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)",[req.user.id]);res.json({ok:true})}catch(e){next(e)}});

router.post("/locations/:id/default", async(req,res,next)=>{const client=await pool.connect();try{await client.query("BEGIN");const exists=await client.query("SELECT id FROM customer_saved_locations WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);if(!exists.rows[0]){await client.query("ROLLBACK");return res.status(404).json({error:"الموقع غير موجود"})}await client.query("UPDATE customer_saved_locations SET is_default=false,updated_at=now() WHERE user_id=$1",[req.user.id]);const {rows}=await client.query("UPDATE customer_saved_locations SET is_default=true,updated_at=now() WHERE id=$1 RETURNING *",[req.params.id]);await client.query("COMMIT");res.json({location:rows[0]})}catch(e){await client.query("ROLLBACK");next(e)}finally{client.release()}});

router.post("/push-token", async(req,res,next)=>{try{const token=String(req.body?.token||"").trim();const platform=String(req.body?.platform||"").trim();if(!token)return res.status(400).json({error:"Push token مطلوب"});await pool.query(`INSERT INTO expo_push_tokens(user_id,token,platform,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,updated_at=now()`,[req.user.id,token,platform||null]);res.json({ok:true})}catch(e){next(e)}});

module.exports = router;
