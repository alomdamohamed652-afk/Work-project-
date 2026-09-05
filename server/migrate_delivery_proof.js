const {pool}=require('./db');
async function main(){await pool.query(`
CREATE TABLE IF NOT EXISTS delivery_proofs(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,proof_type TEXT NOT NULL CHECK(proof_type IN ('pin','photo')),pin_hash TEXT,pin_value TEXT,media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS delivery_proofs_driver_idx ON delivery_proofs(driver_id,created_at DESC);
ALTER TABLE delivery_proofs ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION enforce_delivery_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='delivered' AND COALESCE(OLD.status,'')<>'delivered' AND NEW.paid_amount>=NEW.total_amount AND COALESCE(NEW.cash_due,0)<=0 AND COALESCE(NEW.payment_method,'cash')<>'cash' THEN
  IF NOT EXISTS(SELECT 1 FROM delivery_proofs p WHERE p.order_id=NEW.id) THEN RAISE EXCEPTION 'DELIVERY_PROOF_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_delivery_proof ON orders;
CREATE TRIGGER trg_enforce_delivery_proof BEFORE UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION enforce_delivery_proof();
`);console.log('Delivery proof migration completed')}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Delivery proof migration failed:',e);await pool.end();process.exit(1)});