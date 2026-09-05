const { pool } = require('./db');

async function main() {
  await pool.query(`
    ALTER TABLE membership_tiers
      ADD COLUMN IF NOT EXISTS promotion_orders INTEGER NOT NULL DEFAULT 0 CHECK (promotion_orders >= 0),
      ADD COLUMN IF NOT EXISTS retention_orders INTEGER NOT NULL DEFAULT 0 CHECK (retention_orders >= 0),
      ADD COLUMN IF NOT EXISTS reward_config JSONB NOT NULL DEFAULT '[]'::jsonb;

    ALTER TABLE customer_memberships
      ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'retention' CHECK (phase IN ('retention','promotion')),
      ADD COLUMN IF NOT EXISTS phase_orders_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_month_tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS last_month_retained BOOLEAN NOT NULL DEFAULT false;

    UPDATE membership_tiers SET promotion_orders = CASE name
      WHEN 'البرونزية' THEN 0 WHEN 'الفضية' THEN 10 WHEN 'الذهبية' THEN 30 WHEN 'الماسية' THEN 40 ELSE monthly_orders END
      WHERE promotion_orders = 0 AND name <> 'البرونزية';

    UPDATE membership_tiers SET retention_orders = CASE name
      WHEN 'البرونزية' THEN 0 WHEN 'الفضية' THEN 10 WHEN 'الذهبية' THEN 4 WHEN 'الماسية' THEN 5 ELSE 0 END
      WHERE retention_orders = 0;

    UPDATE membership_tiers SET reward_config = CASE name
      WHEN 'البرونزية' THEN '[{"type":"basic","label":"العروض الأساسية"}]'::jsonb
      WHEN 'الفضية' THEN '[{"type":"delivery_percent","value":5,"label":"خصم 5% على التوصيل"}]'::jsonb
      WHEN 'الذهبية' THEN '[{"type":"delivery_percent","value":10,"label":"خصم 10% على التوصيل"},{"type":"order_percent","value":5,"label":"خصم 5% على الطلب"}]'::jsonb
      WHEN 'الماسية' THEN '[{"type":"delivery_percent","value":20,"label":"خصم 20% على التوصيل"},{"type":"order_percent","value":10,"label":"خصم 10% على الطلب"}]'::jsonb
      ELSE reward_config END
      WHERE reward_config = '[]'::jsonb;

    CREATE INDEX IF NOT EXISTS customer_memberships_month_idx ON customer_memberships(month_key, tier_id);
  `);
  console.log('Membership v2 migration completed');
}

module.exports = main;
if (require.main === module) main().then(() => pool.end()).catch(async e => { console.error(e); await pool.end(); process.exit(1); });
