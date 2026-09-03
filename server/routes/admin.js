const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin"));

router.get("/me", (req, res) => res.json({ user: req.user }));

router.get("/stats", async (_req, res, next) => {
  try {
    const [{ rows: users }, { rows: drivers }, { rows: restaurants }, { rows: categories }] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'driver' AND status = 'active'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'restaurant' AND status = 'active'"),
      pool.query("SELECT COUNT(*)::int AS count FROM categories WHERE is_active = true")
    ]);
    res.json({
      users: users[0].count,
      activeDrivers: drivers[0].count,
      activeRestaurants: restaurants[0].count,
      activeCategories: categories[0].count
    });
  } catch (error) { next(error); }
});

router.get("/users", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, phone, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC"
    );
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

    if (target.id === req.user.id && (role !== undefined && role !== "admin" || status === "suspended")) {
      return res.status(400).json({ error: "The current admin cannot remove or suspend itself" });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET role = COALESCE($1, role), status = COALESCE($2, status), updated_at = now()
       WHERE id = $3
       RETURNING id, full_name, phone, email, role, status, created_at, updated_at`,
      [role ?? null, status ?? null, req.params.id]
    );
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
