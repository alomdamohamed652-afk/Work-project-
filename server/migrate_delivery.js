const { pool } = require("./db");

async function main() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS drivers_availability_idx
      ON users(role, status, is_online, is_available);

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      min_latitude DOUBLE PRECISION,
      max_latitude DOUBLE PRECISION,
      min_longitude DOUBLE PRECISION,
      max_longitude DOUBLE PRECISION,
      fixed_price NUMERIC(10,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS delivery_distance_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      min_meters INTEGER NOT NULL CHECK (min_meters >= 0),
      max_meters INTEGER,
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS delivery_distance_meters INTEGER,
      ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS orders_dispatch_idx
      ON orders(driver_id, status, created_at DESC);
  `);

  console.log("Delivery migration completed");
  await pool.end();
}

main().catch(async (error) => {
  console.error("Delivery migration failed:", error);
  await pool.end();
  process.exit(1);
});