const {pool}=require("./db");
async function main(){await pool.query(`
CREATE TABLE IF NOT EXISTS device_identities(
 device_hash TEXT PRIMARY KEY,
 first_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 first_offer_claimed_at TIMESTAMPTZ,
 risk_level TEXT NOT NULL DEFAULT 'normal' CHECK(risk_level IN ('normal','review','blocked')),
 notes TEXT
);
CREATE TABLE IF NOT EXISTS user_device_links(
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device_hash TEXT NOT NULL REFERENCES device_identities(device_hash) ON DELETE CASCADE,
 first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,device_hash)
);
CREATE INDEX IF NOT EXISTS user_device_links_device_idx ON user_device_links(device_hash);
CREATE TABLE IF NOT EXISTS promotion_rules(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name TEXT NOT NULL,
 promotion_type TEXT NOT NULL CHECK(promotion_type IN ('free_delivery','delivery_percentage','fixed_discount','product_discount')),
 trigger_type TEXT NOT NULL CHECK(trigger_type IN ('first_order','referral_threshold','manual')),
 config JSONB NOT NULL DEFAULT '{}'::jsonb,
 is_active BOOLEAN NOT NULL DEFAULT true,
 starts_at TIMESTAMPTZ,
 expires_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotion_usages(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 promotion_id UUID NOT NULL REFERENCES promotion_rules(id) ON DELETE RESTRICT,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device_hash TEXT,
 checkout_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
 discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(promotion_id,user_id),
 UNIQUE(promotion_id,device_hash)
);
CREATE INDEX IF NOT EXISTS promotion_usages_user_idx ON promotion_usages(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS referral_profiles(
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 code TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS referrals(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 referee_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 device_hash TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','qualified','rejected','rewarded')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 qualified_at TIMESTAMPTZ,
 rejected_reason TEXT,
 rewarded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id,status,created_at DESC);CREATE TABLE IF NOT EXISTS referral_reward_grants(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,reward_type TEXT NOT NULL, reward_value NUMERIC(12,2) NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','used','expired','blocked')),checkout_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),used_at TIMESTAMPTZ);CREATE INDEX IF NOT EXISTS referral_reward_grants_user_idx ON referral_reward_grants(user_id,status,created_at DESC);
INSERT INTO promotion_rules(name,promotion_type,trigger_type,config,is_active) SELECT 'أول طلب شحن مجاني','free_delivery','first_order','{}'::jsonb,true WHERE NOT EXISTS(SELECT 1 FROM promotion_rules WHERE trigger_type='first_order');INSERT INTO platform_settings(key,value) VALUES
 ('promotion.first_order.enabled','true'),
 ('promotion.first_order.name','أول طلب شحن مجاني'),
 ('referral.enabled','true'),
 ('referral.required_count','3'),
 ('referral.reward_type','free_delivery'),
 ('referral.reward_value','1'),
 ('referral.qualification','registration')
ON CONFLICT(key) DO NOTHING;
`);console.log("Promotions/referrals migration completed")}
module.exports=main;if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error(e);await pool.end();process.exit(1)});