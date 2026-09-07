const { pool } = require("./db");

async function main() {
  await pool.query(`
    ALTER TABLE refund_requests
      ADD COLUMN IF NOT EXISTS external_reference TEXT,
      ADD COLUMN IF NOT EXISTS proof_media_id UUID;

    ALTER TABLE refund_requests
      DROP CONSTRAINT IF EXISTS refund_requests_source_required;

    ALTER TABLE refund_requests
      ADD CONSTRAINT refund_requests_source_required
      CHECK (order_id IS NOT NULL OR checkout_id IS NOT NULL);

    CREATE INDEX IF NOT EXISTS location_history_created_at_idx
      ON location_history(created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_checkout_debit_unique_idx
      ON wallet_transactions(user_id, reference_type, reference_id, type)
      WHERE reference_type='checkout' AND reference_id IS NOT NULL AND type='debit';

    CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_checkout_refund_unique_idx
      ON wallet_transactions(user_id, reference_type, reference_id, type)
      WHERE reference_type='checkout' AND reference_id IS NOT NULL AND type='refund';
  `);
  console.log("Audit hardening migration completed");
}

module.exports = main;
if (require.main === module) {
  main().then(() => pool.end()).catch(async (e) => {
    console.error("Audit hardening migration failed:", e);
    await pool.end();
    process.exit(1);
  });
}
