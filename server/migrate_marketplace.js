const {pool}=require('./db');

async function main(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplaces(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      show_on_home BOOLEAN NOT NULL DEFAULT true,
      show_in_search BOOLEAN NOT NULL DEFAULT true,
      show_categories BOOLEAN NOT NULL DEFAULT true,
      display_layout TEXT NOT NULL DEFAULT 'grid' CHECK(display_layout IN ('horizontal','grid','single')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS marketplace_categories(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      icon TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(marketplace_id,name)
    );
    CREATE TABLE IF NOT EXISTS marketplace_subcategories(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      image_url TEXT,
      icon TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(category_id,name)
    );
    ALTER TABLE restaurant_profiles ADD COLUMN IF NOT EXISTS marketplace_id UUID REFERENCES marketplaces(id) ON DELETE SET NULL;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS marketplace_category_id UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL;
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS marketplace_subcategory_id UUID REFERENCES marketplace_subcategories(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS marketplaces_visible_idx ON marketplaces(is_active,show_on_home,sort_order);
    CREATE INDEX IF NOT EXISTS marketplace_categories_visible_idx ON marketplace_categories(marketplace_id,is_active,sort_order);
    CREATE INDEX IF NOT EXISTS marketplace_subcategories_visible_idx ON marketplace_subcategories(category_id,is_active,sort_order);
    CREATE INDEX IF NOT EXISTS restaurant_profiles_marketplace_idx ON restaurant_profiles(marketplace_id);
    CREATE INDEX IF NOT EXISTS menu_items_marketplace_category_idx ON menu_items(marketplace_category_id);
    INSERT INTO marketplaces(slug,name,icon,description,sort_order)
    VALUES
      ('restaurants','المطاعم','🍽️','المطاعم والوجبات',1),
      ('pharmacies','الصيدليات','💊','الأدوية والعناية والصحة',2),
      ('supermarkets','السوبر ماركت','🛒','احتياجات المنزل اليومية',3),
      ('butcher','الجزارة','🥩','اللحوم والدواجن',4)
    ON CONFLICT(slug) DO NOTHING;
  `);
  const map={restaurant:'restaurants',pharmacy:'pharmacies',supermarket:'supermarkets',butcher:'butcher'};
  for(const [type,slug] of Object.entries(map)){
    await pool.query(`UPDATE restaurant_profiles rp SET marketplace_id=m.id FROM marketplaces m WHERE rp.marketplace_id IS NULL AND rp.merchant_type=$1 AND m.slug=$2`,[type,slug]);
  }
  console.log('Marketplace migration completed');
}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Marketplace migration failed',e);await pool.end();process.exit(1)});