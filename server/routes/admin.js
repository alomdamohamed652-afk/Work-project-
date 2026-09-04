const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin"));

router.get("/me", (req, res) => res.json({ user: req.user }));

router.get("/stats", async (_req, res, next) => {
  try {
    const [{ rows: users }, { rows: drivers }, { rows: restaurants }, { rows: categories }, { rows: pending }] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'driver' AND status = 'active'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'restaurant' AND status = 'active'"),
      pool.query("SELECT COUNT(*)::int AS count FROM categories WHERE is_active = true"),
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE status IN ('pending','restaurant_pending')")
    ]);
    res.json({ users: users[0].count, activeDrivers: drivers[0].count, activeRestaurants: restaurants[0].count, activeCategories: categories[0].count, pendingOrders: pending[0].count });
  } catch (error) { next(error); }
});

router.get("/users", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, full_name, phone, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC");
    res.json({ users: rows });
  } catch (error) { next(error); }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const { role, status } = req.body;
    const allowedRoles = ["customer", "driver", "restaurant", "staff", "admin"];
    const allowedStatus = ["active", "suspended", "pending"];
    if (role !== undefined && !allowedRoles.includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (status !== undefined && !allowedStatus.includes(status)) return res.status(400).json({ error: "Invalid status" });
    if (role === undefined && status === undefined) return res.status(400).json({ error: "Nothing to update" });
    const { rows: targetRows } = await pool.query("SELECT id, role FROM users WHERE id = $1", [req.params.id]);
    const target = targetRows[0];
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.id === req.user.id && ((role !== undefined && role !== "admin") || status === "suspended")) return res.status(400).json({ error: "The current admin cannot remove or suspend itself" });
    const { rows } = await pool.query(`UPDATE users SET role=COALESCE($1,role),status=COALESCE($2,status),updated_at=now() WHERE id=$3 RETURNING id,full_name,phone,email,role,status,created_at,updated_at`, [role ?? null,status ?? null,req.params.id]);
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

router.get("/restaurants", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.phone, u.email, u.status, u.created_at,
             rp.display_name, rp.description, rp.logo_url, rp.address, rp.area,
             rp.minimum_order, rp.preparation_minutes, rp.is_open, rp.is_featured,
             COUNT(mi.id)::int AS menu_items
      FROM users u
      LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=u.id
      LEFT JOIN menu_items mi ON mi.restaurant_id=u.id
      WHERE u.role='restaurant'
      GROUP BY u.id,rp.id
      ORDER BY COALESCE(rp.is_featured,false) DESC, COALESCE(rp.display_name,u.full_name)
    `);
    res.json({ restaurants: rows });
  } catch (error) { next(error); }
});

router.patch("/restaurants/:id", async (req, res, next) => {
  try {
    const { status, isOpen, isFeatured, displayName, description, address, area, minimumOrder, preparationMinutes } = req.body || {};
    if (status !== undefined && !["active","suspended","pending"].includes(status)) return res.status(400).json({ error: "حالة المطعم غير صحيحة" });
    const user = await pool.query("SELECT id FROM users WHERE id=$1 AND role='restaurant'", [req.params.id]);
    if (!user.rows[0]) return res.status(404).json({ error: "المطعم غير موجود" });

    await pool.query("BEGIN");
    try {
      if (status !== undefined) await pool.query("UPDATE users SET status=$1,updated_at=now() WHERE id=$2", [status,req.params.id]);
      const current = await pool.query("SELECT * FROM restaurant_profiles WHERE restaurant_id=$1", [req.params.id]);
      const existing = current.rows[0];
      await pool.query(`
        INSERT INTO restaurant_profiles (restaurant_id,display_name,description,address,area,minimum_order,preparation_minutes,is_open,is_featured)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (restaurant_id) DO UPDATE SET
          display_name=EXCLUDED.display_name,description=EXCLUDED.description,address=EXCLUDED.address,area=EXCLUDED.area,
          minimum_order=EXCLUDED.minimum_order,preparation_minutes=EXCLUDED.preparation_minutes,is_open=EXCLUDED.is_open,
          is_featured=EXCLUDED.is_featured,updated_at=now()
      `, [
        req.params.id,
        displayName !== undefined ? String(displayName).trim() : (existing?.display_name || (await pool.query("SELECT full_name FROM users WHERE id=$1",[req.params.id])).rows[0].full_name),
        description !== undefined ? String(description).trim() : existing?.description || null,
        address !== undefined ? String(address).trim() : existing?.address || null,
        area !== undefined ? String(area).trim() : existing?.area || null,
        minimumOrder !== undefined ? Number(minimumOrder) : Number(existing?.minimum_order || 0),
        preparationMinutes !== undefined ? Number(preparationMinutes) : Number(existing?.preparation_minutes || 30),
        isOpen !== undefined ? Boolean(isOpen) : existing?.is_open ?? true,
        isFeatured !== undefined ? Boolean(isFeatured) : existing?.is_featured ?? false
      ]);
      await pool.query("COMMIT");
    } catch (error) { await pool.query("ROLLBACK"); throw error; }
    const { rows } = await pool.query(`SELECT u.id,u.full_name,u.phone,u.email,u.status,rp.display_name,rp.description,rp.address,rp.area,rp.minimum_order,rp.preparation_minutes,rp.is_open,rp.is_featured FROM users u LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=u.id WHERE u.id=$1`,[req.params.id]);
    res.json({ restaurant: rows[0] });
  } catch (error) { next(error); }
});

router.get("/settings", async (_req, res, next) => {
  try { const { rows } = await pool.query("SELECT key,value,updated_at FROM platform_settings ORDER BY key"); res.json({ settings: rows }); }
  catch (error) { next(error); }
});

router.patch("/settings", async (req, res, next) => {
  try {
    const settings = req.body?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return res.status(400).json({ error: "settings must be an object" });
    const entries = Object.entries(settings); if (!entries.length) return res.status(400).json({ error: "No settings supplied" });
    await pool.query("BEGIN");
    try {
      for (const [key,value] of entries) {
        const normalizedKey=String(key).trim();
        if (!/^[a-z][a-z0-9_.-]{0,63}$/i.test(normalizedKey)) { await pool.query("ROLLBACK"); return res.status(400).json({ error:`Invalid setting key: ${normalizedKey}` }); }
        await pool.query(`INSERT INTO platform_settings(key,value,updated_at) VALUES($1,$2,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,[normalizedKey,value==null?"":String(value)]);
      }
      await pool.query("COMMIT");
    } catch(error){ await pool.query("ROLLBACK"); throw error; }
    const { rows }=await pool.query("SELECT key,value,updated_at FROM platform_settings ORDER BY key"); res.json({settings:rows});
  } catch(error){next(error);}
});

module.exports = router;
