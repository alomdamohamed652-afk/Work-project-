const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.use(requireAuth, requireRole("admin"));

router.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, full_name, phone, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  res.json({ users: rows });
});

router.patch("/users/:id", async (req, res) => {
  const { role, status } = req.body;
  const allowedRoles = ["customer", "driver", "restaurant", "staff", "admin"];
  const allowedStatus = ["active", "suspended", "pending"];

  if (role !== undefined && !allowedRoles.includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (status !== undefined && !allowedStatus.includes(status)) return res.status(400).json({ error: "Invalid status" });
  if (role === undefined && status === undefined) return res.status(400).json({ error: "Nothing to update" });

  // The bootstrap admin cannot be demoted or suspended through the normal UI.
  const { rows: targetRows } = await pool.query("SELECT id, role FROM users WHERE id = $1", [req.params.id]);
  const target = targetRows[0];
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === req.user.id && (role !== "admin" || status === "suspended")) {
    return res.status(400).json({ error: "The primary admin cannot be removed or demoted here" });
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET role = COALESCE($1, role), status = COALESCE($2, status), updated_at = now()
     WHERE id = $3
     RETURNING id, full_name, phone, email, role, status, created_at, updated_at`,
    [role ?? null, status ?? null, req.params.id]
  );
  res.json({ user: rows[0] });
});

module.exports = router;