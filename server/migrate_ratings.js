const { pool } = require('./db');

module.exports = async function () {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
      restaurant_rating SMALLINT,
      driver_rating SMALLINT,
      restaurant_comment TEXT,
      driver_comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (restaurant_rating IS NULL OR restaurant_rating BETWEEN 1 AND 5),
      CHECK (driver_rating IS NULL OR driver_rating BETWEEN 1 AND 5),
      CHECK (restaurant_rating IS NOT NULL OR driver_rating IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS order_ratings_restaurant_idx ON order_ratings(restaurant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS order_ratings_driver_idx ON order_ratings(driver_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS order_ratings_customer_idx ON order_ratings(customer_id, created_at DESC);
  `);
};
