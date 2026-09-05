const { pool } = require("./db");
async function main(){
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS customer_saved_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,address TEXT,area TEXT,building TEXT,floor TEXT,apartment TEXT,notes TEXT,
      latitude DOUBLE PRECISION,longitude DOUBLE PRECISION,accuracy DOUBLE PRECISION,is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
    );
    CREATE INDEX IF NOT EXISTS customer_saved_locations_user_idx ON customer_saved_locations(user_id,created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS customer_saved_locations_default_idx ON customer_saved_locations(user_id) WHERE is_default=true;
    CREATE TABLE IF NOT EXISTS expo_push_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,platform TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS expo_push_tokens_user_idx ON expo_push_tokens(user_id);
  `);
  console.log("Customer migration completed"); await pool.end();
}
main().catch(async e=>{console.error("Customer migration failed:",e);await pool.end();process.exit(1)});
