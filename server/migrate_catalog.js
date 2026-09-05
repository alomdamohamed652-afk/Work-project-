const {pool}=require('./db');
const governorates={
'القاهرة':['مدينة نصر','مصر الجديدة','المعادي','حلوان','المقطم','شبرا','المرج','عين شمس'],
'الجيزة':['الجيزة','6 أكتوبر','الشيخ زايد','الحوامدية','أوسيم','كرداسة','أبو النمرس','العياط'],
'القليوبية':['بنها','شبرا الخيمة','قليوب','الخانكة','طوخ','شبين القناطر','القناطر الخيرية','كفر شكر'],
'الإسكندرية':['المنتزه','شرق الإسكندرية','وسط الإسكندرية','غرب الإسكندرية','العامرية','برج العرب'],
'البحيرة':['دمنهور','كفر الدوار','رشيد','إدكو','أبو حمص','أبو المطامير','حوش عيسى','الدلنجات','المحمودية','شبراخيت','إيتاي البارود','وادي النطرون'],
'الدقهلية':['المنصورة','ميت غمر','طلخا','بلقاس','دكرنس','السنبلاوين','المنزلة','المطرية','أجا','شربين','منية النصر','نبروه'],
'دمياط':['دمياط','فارسكور','الزرقا','كفر سعد','كفر البطيخ'],
'الشرقية':['الزقازيق','بلبيس','منيا القمح','فاقوس','أبو كبير','الحسينية','ههيا','أبو حماد','ديرب نجم','كفر صقر'],
'الغربية':['طنطا','المحلة الكبرى','كفر الزيات','زفتى','السنطة','سمنود','قطور','بسيون'],
'المنوفية':['شبين الكوم','منوف','السادات','أشمون','الباجور','تلا','بركة السبع','قويسنا'],
'كفر الشيخ':['كفر الشيخ','دسوق','فوه','مطوبس','الحامول','بيلا','سيدي سالم','قلين','الرياض','بلطيم'],
'الإسماعيلية':['الإسماعيلية','فايد','القنطرة شرق','القنطرة غرب','التل الكبير','القصاصين'],
'بورسعيد':['بورسعيد','بورفؤاد'],
'السويس':['السويس'],
'الفيوم':['الفيوم','سنورس','إطسا','طامية','أبشواي','يوسف الصديق'],
'بني سويف':['بني سويف','الواسطي','ناصر','إهناسيا','ببا','الفشن','سمسطا'],
'المنيا':['المنيا','ملوي','مغاغة','بني مزار','أبو قرقاص','سمالوط','مطاي','العدوة','دير مواس'],
'أسيوط':['أسيوط','ديروط','القوصية','منفلوط','أبنوب','أبو تيج','الغنايم','ساحل سليم','البداري','صدفا'],
'سوهاج':['سوهاج','أخميم','جرجا','البلينا','المنشأة','طهطا','طما','المراغة','جهينة','دار السلام'],
'قنا':['قنا','نجع حمادي','دشنا','فرشوط','أبو تشت','قوص','نقادة','قفط'],
'الأقصر':['الأقصر','إسنا','أرمنت','الطود','القرنة'],
'أسوان':['أسوان','كوم أمبو','دراو','إدفو','نصر النوبة'],
'البحر الأحمر':['الغردقة','رأس غارب','سفاجا','القصير','مرسى علم','الشلاتين','حلايب'],
'الوادي الجديد':['الخارجة','الداخلة','الفرافرة','باريس','بلاط'],
'مطروح':['مرسى مطروح','الحمام','العلمين','الضبعة','سيدي براني','السلوم','النجيلة','سيوة'],
'شمال سيناء':['العريش','بئر العبد','الشيخ زويد','رفح','الحسنة','نخل'],
'جنوب سيناء':['الطور','شرم الشيخ','دهب','نويبع','رأس سدر','أبو رديس','أبو زنيمة','سانت كاترين']
};
async function main(){await pool.query(`
CREATE TABLE IF NOT EXISTS promo_banners(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),title TEXT NOT NULL,subtitle TEXT,image_url TEXT NOT NULL,action_label TEXT,action_route TEXT,is_active BOOLEAN NOT NULL DEFAULT true,sort_order INTEGER NOT NULL DEFAULT 0,starts_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,created_by UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS promo_banners_active_idx ON promo_banners(is_active,sort_order,created_at DESC);
CREATE TABLE IF NOT EXISTS membership_tiers(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL UNIQUE,monthly_orders INTEGER NOT NULL CHECK(monthly_orders>=0),badge_label TEXT,benefits JSONB NOT NULL DEFAULT '[]'::jsonb,is_active BOOLEAN NOT NULL DEFAULT true,sort_order INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS restaurant_badges(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL UNIQUE,description TEXT,icon TEXT,is_active BOOLEAN NOT NULL DEFAULT true,sort_order INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS restaurant_badge_links(restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,badge_id UUID NOT NULL REFERENCES restaurant_badges(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(restaurant_id,badge_id));
CREATE TABLE IF NOT EXISTS restaurant_category_links(restaurant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(restaurant_id,category_id));
CREATE TABLE IF NOT EXISTS customer_memberships(user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,month_key TEXT NOT NULL,orders_count INTEGER NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS egypt_governorates(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL UNIQUE,is_active BOOLEAN NOT NULL DEFAULT true,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS egypt_centers(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),governorate_id UUID NOT NULL REFERENCES egypt_governorates(id) ON DELETE CASCADE,name TEXT NOT NULL,is_active BOOLEAN NOT NULL DEFAULT true,sort_order INTEGER NOT NULL DEFAULT 0,UNIQUE(governorate_id,name));
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
INSERT INTO membership_tiers(name,monthly_orders,badge_label,benefits,sort_order) VALUES('البرونزية',0,'Bronze','["عروض أساسية","متابعة الطلبات"]',1),('الفضية',10,'Silver','["خصومات إضافية","أولوية في بعض العروض"]',2),('الذهبية',20,'Gold','["عروض ذهبية","خصومات توصيل"]',3),('الماسية',40,'Diamond','["أفضل العروض","مزايا VIP"]',4) ON CONFLICT(name) DO UPDATE SET monthly_orders=EXCLUDED.monthly_orders,benefits=EXCLUDED.benefits,badge_label=EXCLUDED.badge_label;
INSERT INTO restaurant_badges(name,description,icon,sort_order) VALUES('الأعلى تقييمًا','مطعم حاصل على تقييمات مرتفعة','★',1),('الأكثر طلبًا','من المطاعم الأكثر طلبًا','🔥',2),('توصيل مجاني','عروض توصيل مجاني','🚚',3),('جديد','مطعم مضاف حديثًا','✨',4),('مميز','مطعم مميز من الإدارة','🏆',5) ON CONFLICT(name) DO NOTHING;
INSERT INTO egypt_governorates(name,sort_order) VALUES ${Object.keys(governorates).map((n,i)=>`('${n.replace(/'/g,"''")}',${i+1})`).join(',')} ON CONFLICT(name) DO NOTHING;
`);
for(const [g,centers] of Object.entries(governorates)){const r=await pool.query('SELECT id FROM egypt_governorates WHERE name=$1',[g]);for(let i=0;i<centers.length;i++)await pool.query('INSERT INTO egypt_centers(governorate_id,name,sort_order) VALUES($1,$2,$3) ON CONFLICT(governorate_id,name) DO NOTHING',[r.rows[0].id,centers[i],i+1]);}
await pool.query(`INSERT INTO customer_memberships(user_id,tier_id,month_key) SELECT u.id,(SELECT id FROM membership_tiers ORDER BY monthly_orders LIMIT 1),to_char(current_date,'YYYY-MM') FROM users u WHERE u.role='customer' ON CONFLICT(user_id) DO NOTHING`);
console.log('Catalog migration completed');}
module.exports=main;if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error(e);await pool.end();process.exit(1)});
