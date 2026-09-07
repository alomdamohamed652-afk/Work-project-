const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

const JWT_SECRET = String(process.env.JWT_SECRET || "");

if (!JWT_SECRET || (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters in production");
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT u.id,u.full_name,u.phone,u.email,u.role,u.status,u.created_at,u.updated_at,
              ep.is_active AS employee_is_active,COALESCE(ep.permissions,'[]'::jsonb) AS permissions
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id=u.id
       WHERE u.id=$1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Account is unavailable" });
    }
    if (user.role === "staff" && user.employee_is_active !== true) {
      return res.status(403).json({ error: "Employee account is inactive" });
    }

    req.user = { ...user, permissions: Array.isArray(user.permissions) ? user.permissions : [] };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const allowed =
      roles.includes(req.user?.role) ||
      (req.user?.role === "super_admin" && roles.includes("admin"));
    if (!req.user || !allowed) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (req.user.role === "admin" || req.user.role === "super_admin") return next();
    if (req.user.role !== "staff") return res.status(403).json({ error: "Insufficient permissions" });

    const granted = new Set(Array.isArray(req.user.permissions) ? req.user.permissions : []);
    const allowed = permissions.every((permission) => granted.has(permission));
    if (!allowed) return res.status(403).json({ error: "Missing required employee permission" });
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin permission required" });
  }
  next();
}

module.exports = { bcrypt, signToken, requireAuth, requireRole, requirePermission, requireSuperAdmin };
