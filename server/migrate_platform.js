const {pool}=require('./db');
async function main(){
 await pool.query(`
 ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS maintenance_orders INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS upgrade_orders INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS badge_type TEXT NOT NULL DEFAULT 'emoji';
 ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS badge_image_url TEXT;
 ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS rewards JSONB NOT NULL DEFAULT '[]'::jsonb;
 ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS started_tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL;
 ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS maintenance_orders_count INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS upgrade_orders_count INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS last_month_tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL;
 UPDATE membership_tiers SET upgrade_orders=monthly_orders WHERE upgrade_orders=0 AND monthly_orders>0;
 UPDATE membership_tiers SET maintenance_orders=CASE WHEN sort_order<=1 THEN 0 WHEN sort_order=2 THEN 10 WHEN sort_order=3 THEN 20 ELSE 40 END WHERE maintenance_orders=0 AND sort_order>1;
 UPDATE membership_tiers SET upgrade_orders=CASE WHEN sort_order=1 THEN 10 WHEN sort_order=2 THEN 30 WHEN sort_order=3 THEN 50 WHEN sort_order=4 THEN 100 ELSE upgrade_orders END;
 CREATE TABLE IF NOT EXISTS platform_ui_settings(id INTEGER PRIMARY KEY CHECK(id=1),show_banners BOOLEAN NOT NULL DEFAULT true,show_categories BOOLEAN NOT NULL DEFAULT true,sections JSONB NOT NULL DEFAULT '[]'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 INSERT INTO platform_ui_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
 CREATE TABLE IF NOT EXISTS support_conversations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,office_id UUID,category TEXT NOT NULL DEFAULT 'general',status TEXT NOT NULL DEFAULT 'open',assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,last_customer_message_at TIMESTAMPTZ,last_staff_message_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON support_conversations(status,updated_at DESC);
 CREATE TABLE IF NOT EXISTS support_messages(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,sender_role TEXT NOT NULL,message TEXT NOT NULL,order_id UUID,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS support_messages_conv_idx ON support_messages(conversation_id,created_at);
 CREATE TABLE IF NOT EXISTS audit_logs(id BIGSERIAL PRIMARY KEY,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,office_id UUID,action TEXT NOT NULL,module TEXT NOT NULL,entity_type TEXT,entity_id TEXT,actor_name TEXT,actor_phone TEXT,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
 CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS offices(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL UNIQUE,is_active BOOLEAN NOT NULL DEFAULT true,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;
 CREATE TABLE IF NOT EXISTS office_service_areas(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,name TEXT NOT NULL,governorate_id UUID REFERENCES egypt_governorates(id) ON DELETE SET NULL,center_id UUID REFERENCES egypt_centers(id) ON DELETE SET NULL,min_latitude DOUBLE PRECISION,max_latitude DOUBLE PRECISION,min_longitude DOUBLE PRECISION,max_longitude DOUBLE PRECISION,is_active BOOLEAN NOT NULL DEFAULT true,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS restaurant_service_areas(restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,area_id UUID NOT NULL REFERENCES office_service_areas(id) ON DELETE CASCADE,PRIMARY KEY(restaurant_id,area_id));
 `);
 await pool.query(`UPDATE customer_memberships cm SET started_tier_id=COALESCE(started_tier_id,cm.tier_id),last_month_tier_id=COALESCE(last_month_tier_id,cm.tier_id) WHERE started_tier_id IS NULL OR last_month_tier_id IS NULL`);
 console.log('Platform migration completed');
}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error(e);await pool.end();process.exit(1)});
