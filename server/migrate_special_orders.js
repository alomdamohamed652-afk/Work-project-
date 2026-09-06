const {pool}=require('./db');
async function main(){
 await pool.query(`
  CREATE TABLE IF NOT EXISTS special_orders(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    place_name TEXT,
    place_description TEXT,
    place_latitude DOUBLE PRECISION,
    place_longitude DOUBLE PRECISION,
    estimated_product_price NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','priced','customer_confirmed','in_progress','completed','rejected','cancelled')),
    quoted_product_price NUMERIC(12,2),
    quoted_delivery_fee NUMERIC(12,2),
    quoted_total NUMERIC(12,2),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    customer_confirmed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS special_orders_customer_idx ON special_orders(customer_id,created_at DESC);
  CREATE INDEX IF NOT EXISTS special_orders_status_idx ON special_orders(status,created_at DESC);
 `);
 console.log('Special order migration completed');
}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Special order migration failed',e);await pool.end();process.exit(1)});