const { Pool } = require("pg");

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const isProduction = process.env.NODE_ENV === "production";
const ca = String(process.env.DATABASE_SSL_CA || "").trim();
const allowInsecure = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() === "false";

if (isProduction && allowInsecure && !process.env.ALLOW_INSECURE_DATABASE_SSL) {
  throw new Error("Refusing insecure database TLS without ALLOW_INSECURE_DATABASE_SSL=true");
}

const ssl = !isProduction
  ? false
  : ca
    ? { ca, rejectUnauthorized: true }
    : { rejectUnauthorized: !allowInsecure };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10000)
});

module.exports = { pool };