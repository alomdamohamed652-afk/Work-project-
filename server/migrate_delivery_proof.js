const {pool}=require('./db');
async function main(){await pool.query(`
CREATE TABLE IF NOT EXISTS delivery_proofs(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,proof_type TEXT NOT NULL CHECK(proof_type IN ('pin','photo')),pin_hash TEXT,pin_value TEXT,media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS delivery_proofs_driver_idx ON delivery_proofs(driver_id,created_at DESC);
ALTER TABLE delivery_proofs ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0;
`);console.log('Delivery proof migration completed')}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Delivery proof migration failed:',e);await pool.end();process.exit(1)});