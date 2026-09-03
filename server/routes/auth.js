const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { bcrypt, signToken, requireAuth } = require("../auth");

router.post("/register", async (req, res) => {
  try {
    const { fullName, phone, email, password } = req.body;
    if (!fullName || !password || (!phone && !email)) {
      return res.status(400).json({ error: "fullName, password and phone or email are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedPhone = phone ? String(phone).trim() : null;
    const passwordHash = await bcrypt.hash(String(password), 12);

    const primaryAdminPhone = process.env.PRIMARY_ADMIN_PHONE
      ? String(process.env.PRIMARY_ADMIN_PHONE).trim()
      : null;
    const role = normalizedPhone && primaryAdminPhone && normalizedPhone === primaryAdminPhone
      ? "admin"
      : "customer";

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, phone, email, role, status, created_at`,
      [String(fullName).trim(), normalizedPhone, normalizedEmail, passwordHash, role]
    );

    const user = rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with this phone or email already exists" });
    console.error(error);
    res.status(500).json({ error: "Unable to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: "identifier and password are required" });

    const value = String(identifier).trim().toLowerCase();
    const { rows } = await pool.query(
      "SELECT id, full_name, phone, email, password_hash, role, status, created_at, updated_at FROM users WHERE lower(coalesce(email,'')) = $1 OR phone = $2 LIMIT 1",
      [value, String(identifier).trim()]
    );
    const user = rows[0];
    if (!user || user.status !== "active") return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    delete user.password_hash;
    res.json({ user, token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to login" });
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
