const { pool } = require("./db");

async function main() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','driver','restaurant','staff','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT users_contact_check CHECK (phone IS NOT NULL OR email IS NOT NULL)
    );

    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
    CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS categories_active_order_idx ON categories(is_active, sort_order, created_at);
  `);

  const adminPhone = String(process.env.PRIMARY_ADMIN_PHONE || '').replace(/[\\s-]/g, '');
  if (adminPhone) {
    await pool.query(
      `UPDATE users SET role = 'admin', status = 'active', updated_at = now() WHERE phone = $1`,
      [adminPhone]
    );
  }

  console.log('Database migration completed');
  await pool.end();
}

main().catch(async (error) => {
  console.error('Database migration failed:', error);
  await pool.end();
  process.exit(1);
});
