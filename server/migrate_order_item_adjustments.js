const {pool}=require('./db');

async function main(){
  await pool.query(`
    ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available',
      ADD COLUMN IF NOT EXISTS unavailable_reason TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_availability_status_check;
    ALTER TABLE order_items ADD CONSTRAINT order_items_availability_status_check CHECK(availability_status IN ('available','unavailable','replacement_pending','replacement_selected','removed'));
    CREATE INDEX IF NOT EXISTS order_items_availability_idx ON order_items(order_id,availability_status);

    CREATE TABLE IF NOT EXISTS order_item_adjustments(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
      action TEXT NOT NULL CHECK(action IN ('mark_unavailable','replace','remove','restore')),
      old_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      new_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS order_item_adjustments_order_idx ON order_item_adjustments(order_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS order_item_adjustments_item_idx ON order_item_adjustments(order_item_id,created_at DESC);
  `);
  console.log('Order item adjustment migration completed');
}

module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Order item adjustment migration failed:',e);await pool.end();process.exit(1)});
