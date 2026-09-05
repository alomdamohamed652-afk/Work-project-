const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("JWT_SECRET is not configured. Auth requests will be unavailable until it is set.");
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

async function requireAuth(req, res, next) {
  try {
    if (!JWT_SECRET) return res.status(503).json({ error: "Authentication is not configured" });
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      "SELECT id, full_name, phone, email, role, status, created_at, updated_at FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== "active") return res.status(401).json({ error: "Account is unavailable" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const allowed = roles.includes(req.user?.role) || (req.user?.role === "super_admin" && roles.includes("admin"));
    if (!req.user || !allowed) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") return res.status(403).json({ error: "Super admin permission required" });
  next();
}

module.exports = { bcrypt, signToken, requireAuth, requireRole, requireSuperAdmin };