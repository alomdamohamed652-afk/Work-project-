const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const isProduction = process.env.NODE_ENV === "production";
const ca = String(process.env.DATABASE_SSL_CA || "").trim();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? ca
      ? { ca, rejectUnauthorized: true }
      : { rejectUnauthorized: false }
    : false
});

module.exports = { pool };