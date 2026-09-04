const { pool } = require("./db");

async function main() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL, phone TEXT UNIQUE,
      secondary_phone TEXT, email TEXT UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','driver','restaurant','staff','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
      area TEXT, address TEXT, building TEXT, floor TEXT, apartment TEXT, address_notes TEXT,
      is_online BOOLEAN NOT NULL DEFAULT false, is_available BOOLEAN NOT NULL DEFAULT false, last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT users_contact_check CHECK (phone IS NOT NULL OR email IS NOT NULL)
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS building TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS floor TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS apartment TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address_notes TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
    CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
    CREATE INDEX IF NOT EXISTS drivers_availability_idx ON users(role,status,is_online,is_available);

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS categories_active_order_idx ON categories(is_active,sort_order,created_at);

    CREATE TABLE IF NOT EXISTS menu_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS menu_categories_restaurant_idx ON menu_categories(restaurant_id,is_active,sort_order);

    CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL, name TEXT NOT NULL, description TEXT,
      price NUMERIC(12,2) NOT NULL CHECK (price >= 0), image_url TEXT, is_available BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items(restaurant_id,is_available,sort_order);

    CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS delivery_zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, min_latitude DOUBLE PRECISION, max_latitude DOUBLE PRECISION,
      min_longitude DOUBLE PRECISION, max_longitude DOUBLE PRECISION, fixed_price NUMERIC(10,2), is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS delivery_distance_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), min_meters INTEGER NOT NULL CHECK (min_meters >= 0), max_meters INTEGER,
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0), is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_locations (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION, heading DOUBLE PRECISION, speed DOUBLE PRECISION, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS user_locations_updated_idx ON user_locations(updated_at DESC);
    CREATE TABLE IF NOT EXISTS location_history (
      id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, heading DOUBLE PRECISION, speed DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS location_history_user_time_idx ON location_history(user_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES users(id), driver_id UUID REFERENCES users(id), restaurant_id UUID REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','restaurant_pending','restaurant_rejected','admin_rejected','confirmed','preparing','ready','assigned','picked_up','on_the_way','delivered','cancelled')),
      delivery_latitude DOUBLE PRECISION, delivery_longitude DOUBLE PRECISION, delivery_address TEXT, delivery_distance_meters INTEGER,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0, total_amount NUMERIC(12,2) NOT NULL DEFAULT 0, restaurant_rejection_reason TEXT,
      admin_rejection_reason TEXT, cancelled_by UUID REFERENCES users(id), cancellation_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_rejection_reason TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_meters INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS orders_driver_idx ON orders(driver_id,status,updated_at DESC);
    CREATE INDEX IF NOT EXISTS orders_dispatch_idx ON orders(driver_id,status,created_at DESC);
  `);
  const adminPhone=String(process.env.PRIMARY_ADMIN_PHONE||'').replace(/[\s-]/g,'');
  if(adminPhone) await pool.query(`UPDATE users SET role='admin',status='active',updated_at=now() WHERE phone=$1`,[adminPhone]);
  console.log('Database migration completed'); await pool.end();
}
main().catch(async e=>{console.error('Database migration failed:',e);await pool.end();process.exit(1);});
