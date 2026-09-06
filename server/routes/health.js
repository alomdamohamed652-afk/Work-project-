const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/live', (_req, res) => {
  res.json({ ok: true, status: 'alive' });
});

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS database_time,
        (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema='public'
            AND table_name IN (
              'users','orders','customer_wallets','wallet_transactions',
              'order_payments','driver_ledger_entries','home_sections','promo_banners'
            )
        ) AS required_tables
    `);
    const requiredTables = Number(result.rows[0].required_tables);
    const ready = requiredTables === 8;
    res.status(ready ? 200 : 503).json({
      ok: ready,
      status: ready ? 'ready' : 'migration_required',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
      requiredTables,
      expectedTables: 8,
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ ok: false, status: 'database_unavailable', database: 'disconnected' });
  }
});

module.exports = router;
