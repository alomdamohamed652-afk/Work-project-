const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { pool } = require("../db");
const { bcrypt, signToken, requireAuth } = require("../auth");

function normalizePhone(value) {
  return String(value || "").replace(/[\s-]/g, "");
}

function isValidEgyptianPhone(phone) {
  return /^01\d{9}$/.test(phone);
}

function getPrimaryAdminPhone() {
  const configured = normalizePhone(process.env.PRIMARY_ADMIN_PHONE);
  return isValidEgyptianPhone(configured) ? configured : null;
}

router.post("/continue", async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!isValidEgyptianPhone(phone)) {
      return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    }

    const primaryAdminPhone = getPrimaryAdminPhone();
    const isPrimaryAdmin = Boolean(primaryAdminPhone && phone === primaryAdminPhone);

    let { rows } = await pool.query(
      "SELECT id, full_name, phone, email, password_hash, role, status, created_at, updated_at FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );

    let user = rows[0];

    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
      ({ rows } = await pool.query(
        `INSERT INTO users (full_name, phone, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, full_name, phone, email, password_hash, role, status, created_at, updated_at`,
        [isPrimaryAdmin ? "مدير النظام" : "عميل جديد", phone, passwordHash, isPrimaryAdmin ? "admin" : "customer"]
      ));
      user = rows[0];
    } else if (isPrimaryAdmin && user.role !== "admin") {
      ({ rows } = await pool.query(
        `UPDATE users
         SET role = 'admin', status = 'active', updated_at = now()
         WHERE id = $1
         RETURNING id, full_name, phone, email, password_hash, role, status, created_at, updated_at`,
        [user.id]
      ));
      user = rows[0];
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "الحساب غير متاح حاليًا" });
    }

    delete user.password_hash;
    res.json({ user, token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "تعذر تسجيل الدخول" });
  }
});

// Legacy password registration kept for staff/internal setup.
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
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const passwordHash = await bcrypt.hash(String(password), 12);
    const primaryAdminPhone = getPrimaryAdminPhone();
    const role = normalizedPhone && primaryAdminPhone && normalizedPhone === primaryAdminPhone ? "admin" : "customer";

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
      [value, normalizePhone(identifier)]
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
