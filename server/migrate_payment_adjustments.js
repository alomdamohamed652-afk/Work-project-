const {pool}=require('./db');
async function main(){await pool.query(`
CREATE TABLE IF NOT EXISTS payment_adjustments(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),checkout_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,amount NUMERIC(12,2) NOT NULL CHECK(amount>0),reason TEXT NOT NULL DEFAULT 'فرق ناتج عن تعديل الطلب',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','rejected')),settlement_method TEXT CHECK(settlement_method IN ('wallet','external')),external_reference TEXT,created_by UUID REFERENCES users(id) ON DELETE SET NULL,processed_by UUID REFERENCES users(id) ON DELETE SET NULL,processed_at TIMESTAMPTZ,customer_notified_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS payment_adjustments_customer_idx ON payment_adjustments(customer_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS payment_adjustments_pending_idx ON payment_adjustments(status,customer_notified_at,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS payment_adjustments_pending_order_idx ON payment_adjustments(order_id) WHERE status='pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_unavailable_notified_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_driver_unavailable_idx ON orders(status,driver_id,driver_unavailable_notified_at);
CREATE OR REPLACE FUNCTION create_payment_adjustment_on_overpay() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE delta NUMERIC(12,2); existing_id UUID;
BEGIN
 IF NEW.total_amount < NEW.paid_amount AND NEW.total_amount <> OLD.total_amount THEN
  delta:=ROUND((NEW.paid_amount-NEW.total_amount)::numeric,2);
  SELECT id INTO existing_id FROM payment_adjustments WHERE order_id=NEW.id AND status='pending' FOR UPDATE;
  IF existing_id IS NULL THEN INSERT INTO payment_adjustments(checkout_id,order_id,customer_id,amount) VALUES(NEW.checkout_id,NEW.id,NEW.customer_id,delta);
  ELSE UPDATE payment_adjustments SET amount=delta,updated_at=now() WHERE id=existing_id;
  END IF;
 END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_payment_adjustment_overpay ON orders;
CREATE TRIGGER trg_payment_adjustment_overpay AFTER UPDATE OF total_amount ON orders FOR EACH ROW EXECUTE FUNCTION create_payment_adjustment_on_overpay();
CREATE OR REPLACE FUNCTION prevent_empty_order_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_count INTEGER;
BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND NEW.availability_status IN ('removed','unavailable','replacement_pending')) THEN
  SELECT COUNT(*) INTO active_count FROM order_items WHERE order_id=OLD.order_id AND id<>OLD.id AND availability_status IN ('available','replacement_selected');
  IF active_count=0 THEN RAISE EXCEPTION 'ORDER_MUST_HAVE_ACTIVE_ITEM'; END IF;
 END IF; RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_prevent_empty_order_items ON order_items;
CREATE TRIGGER trg_prevent_empty_order_items BEFORE DELETE OR UPDATE OF availability_status ON order_items FOR EACH ROW EXECUTE FUNCTION prevent_empty_order_items();
CREATE OR REPLACE FUNCTION prevent_edit_unavailable_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='UPDATE' AND NEW.quantity<>OLD.quantity AND OLD.availability_status NOT IN ('available','replacement_selected') THEN RAISE EXCEPTION 'ITEM_UNAVAILABLE_MUST_BE_RESOLVED'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_prevent_edit_unavailable_item ON order_items;
CREATE TRIGGER trg_prevent_edit_unavailable_item BEFORE UPDATE OF quantity ON order_items FOR EACH ROW EXECUTE FUNCTION prevent_edit_unavailable_item();
`);console.log('Payment adjustment migration completed')}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Payment adjustment migration failed:',e);await pool.end();process.exit(1)});
