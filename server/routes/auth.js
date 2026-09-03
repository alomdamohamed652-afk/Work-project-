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

function publicUser(user) {
  const result = { ...user };
  delete result.password_hash;
  return result;
}

router.post("/register-customer", async (req, res) => {
  try {
    const body = req.body || {};
    const fullName = String(body.fullName || "").trim();
    const phone = normalizePhone(body.phone);
    const secondaryPhone = normalizePhone(body.secondaryPhone);
    const email = body.email ? String(body.email).trim().toLowerCase() : null;

    if (fullName.length < 2) return res.status(400).json({ error: "اكتب الاسم بالكامل" });
    if (!isValidEgyptianPhone(phone)) return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    if (secondaryPhone && !isValidEgyptianPhone(secondaryPhone)) return res.status(400).json({ error: "رقم الهاتف الاحتياطي غير صحيح" });
    if (secondaryPhone && secondaryPhone === phone) return res.status(400).json({ error: "رقم الهاتف الاحتياطي يجب أن يكون مختلفًا" });

    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const { rows } = await pool.query(
      `INSERT INTO users
        (full_name, phone, secondary_phone, email, password_hash, role, area, address, building, floor, apartment, address_notes)
       VALUES ($1,$2,$3,$4,$5,'customer',$6,$7,$8,$9,$10,$11)
       RETURNING id, full_name, phone, secondary_phone, email, role, status, area, address, building, floor, apartment, address_notes, created_at, updated_at`,
      [
        fullName, phone, secondaryPhone || null, email,
        body.area ? String(body.area).trim() : null,
        body.address ? String(body.address).trim() : null,
        body.building ? String(body.building).trim() : null,
        body.floor ? String(body.floor).trim() : null,
        body.apartment ? String(body.apartment).trim() : null,
        body.addressNotes ? String(body.addressNotes).trim() : null
      ]
    );

    const user = rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل" });
    console.error(error);
    res.status(500).json({ error: "تعذر إنشاء الحساب" });
  }
});

router.post("/continue", async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!isValidEgyptianPhone(phone)) return res.status(400).json({ error: "رقم الهاتف غير صحيح" });

    const primaryAdminPhone = getPrimaryAdminPhone();
    const isPrimaryAdmin = Boolean(primaryAdminPhone && phone === primaryAdminPhone);
    const { rows } = await pool.query(
      "SELECT id, full_name, phone, secondary_phone, email, password_hash, role, status, area, address, building, floor, apartment, address_notes, created_at, updated_at FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );
    let user = rows[0];
    if (!user) return res.status(404).json({ error: "الحساب غير موجود. اختر إنشاء حساب جديد." });

    if (isPrimaryAdmin && user.role !== "admin") {
      const result = await pool.query(
        "UPDATE users SET role='admin', status='active', updated_at=now() WHERE id=$1 RETURNING id, full_name, phone, secondary_phone, email, password_hash, role, status, area, address, building, floor, apartment, address_notes, created_at, updated_at",
        [user.id]
      );
      user = result.rows[0];
    }
    if (user.status !== "active") return res.status(403).json({ error: "الحساب غير متاح حاليًا" });
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "تعذر تسجيل الدخول" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { fullName, phone, email, password } = req.body;
    if (!fullName || !password || (!phone && !email)) return res.status(400).json({ error: "بيانات التسجيل ناقصة" });
    if (String(password).length < 8) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const passwordHash = await bcrypt.hash(String(password), 12);
    const primaryAdminPhone = getPrimaryAdminPhone();
    const role = normalizedPhone && primaryAdminPhone && normalizedPhone === primaryAdminPhone ? "admin" : "customer";
    const { rows } = await pool.query(
      "INSERT INTO users (full_name, phone, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, phone, email, role, status, created_at",
      [String(fullName).trim(), normalizedPhone, normalizedEmail, passwordHash, role]
    );
    const user = rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "الحساب موجود بالفعل" });
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
      "SELECT id, full_name, phone, email, password_hash, role, status FROM users WHERE lower(coalesce(email,''))=$1 OR phone=$2 LIMIT 1",
      [value, normalizePhone(identifier)]
    );
    const user = rows[0];
    if (!user || user.status !== "active") return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    if (!await bcrypt.compare(String(password), user.password_hash)) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to login" });
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
