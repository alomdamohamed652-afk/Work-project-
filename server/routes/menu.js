const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.get("/restaurant/:restaurantId", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.full_name AS restaurant_name, r.area, r.address,
              m.id AS item_id, m.name, m.description, m.price, m.image_url, m.is_available, m.sort_order,
              c.id AS category_id, c.name AS category_name
       FROM users r
       LEFT JOIN menu_items m ON m.restaurant_id=r.id AND m.is_available=true
       LEFT JOIN menu_categories c ON c.id=m.category_id AND c.restaurant_id=r.id AND c.is_active=true
       WHERE r.id=$1 AND r.role='restaurant' AND r.status='active'
       ORDER BY COALESCE(c.sort_order,0), COALESCE(m.sort_order,0), m.created_at`,
      [req.params.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: "المطعم غير موجود" });
    res.json({ restaurant: { id: rows[0].id, name: rows[0].restaurant_name, area: rows[0].area, address: rows[0].address }, items: rows.filter(x => x.item_id) });
  } catch (error) { next(error); }
});

router.get("/mine", requireAuth, requireRole("restaurant"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, c.name AS category_name FROM menu_items m
       LEFT JOIN menu_categories c ON c.id=m.category_id
       WHERE m.restaurant_id=$1 ORDER BY COALESCE(c.sort_order,0), m.sort_order, m.created_at`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (error) { next(error); }
});

router.post("/categories", requireAuth, requireRole("restaurant"), async (req,res,next)=>{
  try {
    const name=String(req.body?.name||"").trim();
    if(!name) return res.status(400).json({error:"اسم القسم مطلوب"});
    const {rows}=await pool.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,$2,$3) RETURNING *`,[req.user.id,name,Number(req.body?.sortOrder||0)]);
    res.status(201).json({category:rows[0]});
  }catch(e){next(e)}
});

router.post("/items", requireAuth, requireRole("restaurant"), async (req,res,next)=>{
  try {
    const name=String(req.body?.name||"").trim(); const price=Number(req.body?.price);
    if(!name || !Number.isFinite(price) || price<0) return res.status(400).json({error:"اسم المنتج والسعر مطلوبان"});
    const categoryId=req.body?.categoryId||null;
    if(categoryId){ const check=await pool.query(`SELECT id FROM menu_categories WHERE id=$1 AND restaurant_id=$2`,[categoryId,req.user.id]); if(!check.rows[0]) return res.status(400).json({error:"قسم غير صحيح"}); }
    const {rows}=await pool.query(`INSERT INTO menu_items (restaurant_id,category_id,name,description,price,image_url,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.user.id,categoryId,name,String(req.body?.description||"").trim()||null,price,String(req.body?.imageUrl||"").trim()||null,Number(req.body?.sortOrder||0)]);
    res.status(201).json({item:rows[0]});
  }catch(e){next(e)}
});

router.patch("/items/:id", requireAuth, requireRole("restaurant"), async (req,res,next)=>{
  try {
    const {rows}=await pool.query(`UPDATE menu_items SET name=COALESCE($1,name),description=COALESCE($2,description),price=COALESCE($3,price),image_url=COALESCE($4,image_url),is_available=COALESCE($5,is_available),updated_at=now() WHERE id=$6 AND restaurant_id=$7 RETURNING *`,[
      req.body?.name===undefined?null:String(req.body.name).trim(), req.body?.description===undefined?null:String(req.body.description).trim()||null,
      req.body?.price===undefined?null:Number(req.body.price), req.body?.imageUrl===undefined?null:String(req.body.imageUrl).trim()||null,
      req.body?.isAvailable===undefined?null:Boolean(req.body.isAvailable), req.params.id, req.user.id]);
    if(!rows[0]) return res.status(404).json({error:"المنتج غير موجود"}); res.json({item:rows[0]});
  }catch(e){next(e)}
});

router.delete("/items/:id", requireAuth, requireRole("restaurant"), async(req,res,next)=>{
 try{const r=await pool.query(`DELETE FROM menu_items WHERE id=$1 AND restaurant_id=$2 RETURNING id`,[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:"المنتج غير موجود"});res.json({ok:true});}catch(e){next(e)}
});

module.exports=router;
