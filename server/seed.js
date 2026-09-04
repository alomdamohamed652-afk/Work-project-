const { pool } = require("./db");
const { bcrypt } = require("./auth");

const DEMO_PASSWORD = "Demo@12345";

const restaurants = [
  {
    name: "Buffalo Burger - Alexandria",
    phone: "01000000001",
    area: "Alexandria",
    address: "Alexandria branch",
    latitude: 31.2001,
    longitude: 29.9187,
    preparation: 30,
    categories: [
      {
        name: "برجر",
        items: [
          ["Old School", "Pure beef burger patty with cheddar cheese and Buffalo sauce.", 190],
          ["Bacon Mushroom Jack", "Beef bacon, fresh sautéed mushroom, cheddar cheese and creamy mayonnaise.", 240],
          ["Blue Cheese", "Pure beef burger with creamy blue cheese and mayonnaise.", 195],
          ["The Rastafari", "Burger with crispy cheddar jalapeño bites and creamy Buffalo sauce.", 215],
          ["Charbroiled BBQ", "Pure beef burger with caramelized onion, BBQ sauce and cheddar cheese.", 195]
        ]
      },
      {
        name: "تشيكن",
        items: [
          ["Rastafari Chicken", "Crispy chicken strips with cheddar jalapeño bites and creamy Buffalo sauce.", 205],
          ["Chicken Ditch", "Crispy chicken breast with beef bacon, mushroom, cheddar and smoky Buff sauce.", 245],
          ["Cholo's Chicken", "Chicken strips, jalapeño, Buffalo sauce and melted cheddar.", 195],
          ["Chicken Buster", "Chicken strips with Buffalo sauce and melted cheddar.", 190]
        ]
      },
      {
        name: "أصناف جانبية",
        items: [
          ["Large French Fries", "Classic large French fries.", 50],
          ["Cheesy Fries", "French fries served with BBQ sauce and cheese.", 95],
          ["Onion Rings", "Crispy onion rings.", 60],
          ["Chicken Tenders", "Chicken tenders served with ranch sauce.", 130],
          ["Mozzarella Bites", "Mozzarella bites served with ranch sauce.", 100]
        ]
      },
      {
        name: "صوصات",
        items: [
          ["Buffalo Sauce", "Buffalo sauce cup.", 10],
          ["Ranch Sauce", "Ranch sauce cup.", 10],
          ["BBQ Sauce", "BBQ sauce cup.", 10],
          ["Cheddar Cheese Sauce", "Cheddar cheese sauce cup.", 25]
        ]
      }
    ]
  },
  {
    name: "El Deb Crepe - Alexandria",
    phone: "01000000002",
    area: "Alexandria",
    address: "Alexandria branch",
    latitude: 31.2156,
    longitude: 29.9553,
    preparation: 25,
    categories: [
      { name: "كريب حادق", items: [
        ["كريب تشيكن رانش", "Chicken, cheese, lettuce and ranch sauce.", 145],
        ["كريب كريسبي", "Crispy chicken, cheese and special sauce.", 150],
        ["كريب ميكس تشيز", "Mixed cheese with vegetables and special sauce.", 125]
      ]},
      { name: "كريب حلو", items: [
        ["كريب نوتيلا", "Nutella crepe.", 90],
        ["كريب نوتيلا موز", "Nutella with banana.", 105],
        ["كريب نوتيلا فراولة", "Nutella with strawberry.", 110]
      ]},
      { name: "مشروبات", items: [
        ["بيبسي", "Chilled Pepsi.", 30],
        ["مياه معدنية", "Bottled water.", 15]
      ]}
    ]
  },
  {
    name: "Roma Pizza To Go - Alexandria",
    phone: "01000000003",
    area: "Alexandria",
    address: "Alexandria branch",
    latitude: 31.2304,
    longitude: 29.9553,
    preparation: 35,
    categories: [
      { name: "بيتزا", items: [
        ["Margherita Pizza", "Tomato sauce, mozzarella and herbs.", 150],
        ["Chicken BBQ Pizza", "Chicken, mozzarella and BBQ sauce.", 190],
        ["Pepperoni Pizza", "Pepperoni, mozzarella and tomato sauce.", 200],
        ["Mix Cheese Pizza", "A rich blend of cheeses with tomato sauce.", 180]
      ]},
      { name: "باستا", items: [
        ["Chicken Alfredo", "Pasta with chicken and creamy Alfredo sauce.", 170],
        ["Penne Arrabbiata", "Penne pasta with spicy tomato sauce.", 130]
      ]},
      { name: "مشروبات", items: [
        ["Cola", "Chilled soft drink.", 30],
        ["Water", "Bottled water.", 15]
      ]}
    ]
  },
  {
    name: "Amazonya - Alexandria",
    phone: "01000000004",
    area: "Alexandria",
    address: "Alexandria branch",
    latitude: 31.2400,
    longitude: 29.9700,
    preparation: 30,
    categories: [
      { name: "برجر", items: [
        ["Classic Beef Burger", "Beef burger with cheese, lettuce, tomato and house sauce.", 180],
        ["Chicken Burger", "Crispy chicken burger with cheese and house sauce.", 170]
      ]},
      { name: "وجبات", items: [
        ["Chicken Meal", "Chicken, fries and house sauce.", 190],
        ["Beef Meal", "Beef burger, fries and house sauce.", 200]
      ]},
      { name: "مشروبات", items: [
        ["Cola", "Chilled soft drink.", 30],
        ["Water", "Bottled water.", 15]
      ]}
    ]
  }
];

const categories = [
  ["برجر", "Burger and grilled sandwiches"],
  ["بيتزا", "Pizza and baked meals"],
  ["كريب", "Crepes and wraps"],
  ["وجبات", "Meals and combos"],
  ["مشروبات", "Cold and hot beverages"],
  ["حلويات", "Desserts and sweets"]
];

async function upsertUser(restaurant) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, status, area, address)
     VALUES ($1,$2,$3,'restaurant','active',$4,$5)
     ON CONFLICT (phone) DO UPDATE SET
       full_name=EXCLUDED.full_name,
       role='restaurant', status='active', area=EXCLUDED.area, address=EXCLUDED.address,
       updated_at=now()
     RETURNING id`,
    [restaurant.name, restaurant.phone, passwordHash, restaurant.area, restaurant.address]
  );
  return rows[0].id;
}

async function seedRestaurant(restaurant) {
  const restaurantId = await upsertUser(restaurant);

  await pool.query(
    `INSERT INTO restaurant_profiles
      (restaurant_id, display_name, description, contact_phone, address, area, latitude, longitude, preparation_minutes, is_open, is_featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true)
     ON CONFLICT (restaurant_id) DO UPDATE SET
       display_name=EXCLUDED.display_name, description=EXCLUDED.description,
       contact_phone=EXCLUDED.contact_phone, address=EXCLUDED.address, area=EXCLUDED.area,
       latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
       preparation_minutes=EXCLUDED.preparation_minutes, is_open=true, is_featured=true, updated_at=now()`,
    [restaurantId, restaurant.name, "Restaurant available for delivery", restaurant.phone, restaurant.address, restaurant.area, restaurant.latitude, restaurant.longitude, restaurant.preparation]
  );

  for (let ci = 0; ci < restaurant.categories.length; ci++) {
    const category = restaurant.categories[ci];
    const categoryResult = await pool.query(
      `INSERT INTO menu_categories (restaurant_id,name,sort_order,is_active)
       VALUES ($1,$2,$3,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [restaurantId, category.name, ci]
    );
    let categoryId = categoryResult.rows[0]?.id;
    if (!categoryId) {
      const existing = await pool.query(`SELECT id FROM menu_categories WHERE restaurant_id=$1 AND name=$2 ORDER BY created_at LIMIT 1`, [restaurantId, category.name]);
      categoryId = existing.rows[0].id;
    }

    for (let ii = 0; ii < category.items.length; ii++) {
      const [name, description, price] = category.items[ii];
      await pool.query(
        `INSERT INTO menu_items (restaurant_id,category_id,name,description,price,is_available,sort_order)
         SELECT $1,$2,$3,$4,$5,true,$6
         WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE restaurant_id=$1 AND name=$3)`,
        [restaurantId, categoryId, name, description, price, ii]
      );
    }
  }

  return restaurantId;
}

async function main() {
  for (let i = 0; i < categories.length; i++) {
    const [name, description] = categories[i];
    await pool.query(
      `INSERT INTO categories (name,description,sort_order,is_active)
       SELECT $1,$2,$3,true
       WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name=$1)`,
      [name, description, i]
    );
  }

  await pool.query(`INSERT INTO delivery_distance_rates (min_meters,max_meters,price,is_active)
    SELECT * FROM (VALUES (0,3000,30,true),(3000,7000,45,true),(7000,12000,60,true),(12000,NULL,80,true)) AS v(a,b,c,d)
    WHERE NOT EXISTS (SELECT 1 FROM delivery_distance_rates WHERE min_meters=0 AND max_meters=3000)`);

  for (const restaurant of restaurants) await seedRestaurant(restaurant);

  console.log(`Seed completed: ${restaurants.length} restaurants with real-world brand/catalog names and demo operational accounts.`);
  console.log(`Restaurant demo password: ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end();
  process.exit(1);
});
