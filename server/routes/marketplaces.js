const express=require('express');
const router=express.Router();
const {pool}=require('../db');
const {requireAuth,requireRole}=require('../auth');
const admin=requireRole('admin','staff');

const slugify=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'');

router.get('/',requireAuth,requireRole('customer'),async(_req,res,next)=>{try{
  const {rows}=await pool.query(`SELECT m.*,COALESCE((SELECT json_agg(c ORDER BY c.sort_order,c.created_at) FROM (SELECT id,name,description,image_url,icon,sort_order FROM marketplace_categories WHERE marketplace_id=m.id AND is_active=true ORDER BY sort_order,created_at LIMIT 20)c),'[]'::json) categories FROM marketplaces m WHERE m.is_active=true AND (m.show_on_home=true OR m.show_in_search=true) ORDER BY m.sort_order,m.created_at`);
  res.json({marketplaces:rows});
}catch(e){next(e)}});

router.get('/:idOrSlug',requireAuth,requireRole('customer'),async(req,res,next)=>{try{
  const q=String(req.params.idOrSlug);
  const {rows}=await pool.query(`SELECT * FROM marketplaces WHERE is_active=true AND (id::text=$1 OR slug=$1) LIMIT 1`,[q]);
  const marketplace=rows[0];if(!marketplace)return res.status(404).json({error:'القسم غير موجود'});
  const cats=await pool.query(`SELECT c.*,COALESCE((SELECT json_agg(s ORDER BY s.sort_order,s.created_at) FROM (SELECT id,name,image_url,icon,sort_order FROM marketplace_subcategories WHERE category_id=c.id AND is_active=true ORDER BY sort_order,created_at)s),'[]'::json) subcategories FROM marketplace_categories c WHERE c.marketplace_id=$1 AND c.is_active=true ORDER BY c.sort_order,c.created_at`,[marketplace.id]);
  const merchants=await pool.query(`SELECT u.id,COALESCE(rp.display_name,u.full_name) name,rp.logo_url,rp.is_open,rp.preparation_minutes FROM restaurant_profiles rp JOIN users u ON u.id=rp.restaurant_id WHERE rp.marketplace_id=$1 AND u.status='active' AND u.role='restaurant' ORDER BY rp.is_featured DESC,name LIMIT 100`,[marketplace.id]);
  res.json({marketplace,categories:marketplace.show_categories?cats.rows:[],merchants:merchants.rows});
}catch(e){next(e)}});

router.get('/admin/all/list',requireAuth,admin,async(_req,res,next)=>{try{
  const m=await pool.query('SELECT * FROM marketplaces ORDER BY sort_order,created_at');
  const c=await pool.query('SELECT * FROM marketplace_categories ORDER BY marketplace_id,sort_order,created_at');
  const s=await pool.query('SELECT * FROM marketplace_subcategories ORDER BY category_id,sort_order,created_at');
  res.json({marketplaces:m.rows,categories:c.rows,subcategories:s.rows});
}catch(e){next(e)}});

router.post('/admin/all',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{},name=String(b.name||'').trim(),slug=slugify(b.slug||name);
  if(!name||!slug)return res.status(400).json({error:'اكتب اسمًا صالحًا للقسم'});
  const {rows}=await pool.query(`INSERT INTO marketplaces(slug,name,description,icon,image_url,is_active,show_on_home,show_in_search,show_categories,display_layout,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[slug,name,b.description?String(b.description).trim():null,b.icon?String(b.icon).trim():null,b.imageUrl?String(b.imageUrl).trim():null,b.isActive!==false,b.showOnHome!==false,b.showInSearch!==false,b.showCategories!==false,['horizontal','grid','single'].includes(b.displayLayout)?b.displayLayout:'grid',Number(b.sortOrder||0)]);
  res.status(201).json({marketplace:rows[0]});
}catch(e){if(e.code==='23505')return res.status(409).json({error:'اسم أو معرف القسم مستخدم بالفعل'});next(e)}});

router.patch('/admin/all/:id',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{};
  const {rows}=await pool.query(`UPDATE marketplaces SET slug=COALESCE($2,slug),name=COALESCE($3,name),description=$4,icon=$5,image_url=$6,is_active=COALESCE($7,is_active),show_on_home=COALESCE($8,show_on_home),show_in_search=COALESCE($9,show_in_search),show_categories=COALESCE($10,show_categories),display_layout=COALESCE($11,display_layout),sort_order=COALESCE($12,sort_order),updated_at=now() WHERE id=$1 RETURNING *`,[req.params.id,b.slug?slugify(b.slug):null,b.name?String(b.name).trim():null,b.description===undefined?null:(b.description||null),b.icon===undefined?null:(b.icon||null),b.imageUrl===undefined?null:(b.imageUrl||null),b.isActive===undefined?null:Boolean(b.isActive),b.showOnHome===undefined?null:Boolean(b.showOnHome),b.showInSearch===undefined?null:Boolean(b.showInSearch),b.showCategories===undefined?null:Boolean(b.showCategories),b.displayLayout&&['horizontal','grid','single'].includes(b.displayLayout)?b.displayLayout:null,b.sortOrder===undefined?null:Number(b.sortOrder)]);
  if(!rows[0])return res.status(404).json({error:'القسم غير موجود'});res.json({marketplace:rows[0]});
}catch(e){next(e)}});

router.post('/admin/all/:id/categories',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{},name=String(b.name||'').trim();if(!name)return res.status(400).json({error:'اكتب اسم القسم الفرعي'});
  const {rows}=await pool.query(`INSERT INTO marketplace_categories(marketplace_id,name,description,image_url,icon,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.id,name,b.description||null,b.imageUrl||null,b.icon||null,b.isActive!==false,Number(b.sortOrder||0)]);
  res.status(201).json({category:rows[0]});
}catch(e){next(e)}});

router.patch('/admin/categories/:id',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{},{rows}=await pool.query(`UPDATE marketplace_categories SET name=COALESCE($2,name),description=$3,image_url=$4,icon=$5,is_active=COALESCE($6,is_active),sort_order=COALESCE($7,sort_order),updated_at=now() WHERE id=$1 RETURNING *`,[req.params.id,b.name?String(b.name).trim():null,b.description===undefined?null:(b.description||null),b.imageUrl===undefined?null:(b.imageUrl||null),b.icon===undefined?null:(b.icon||null),b.isActive===undefined?null:Boolean(b.isActive),b.sortOrder===undefined?null:Number(b.sortOrder)]);
  if(!rows[0])return res.status(404).json({error:'القسم غير موجود'});res.json({category:rows[0]});
}catch(e){next(e)}});

router.post('/admin/categories/:id/subcategories',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{},name=String(b.name||'').trim();if(!name)return res.status(400).json({error:'اكتب اسم التصنيف'});
  const {rows}=await pool.query(`INSERT INTO marketplace_subcategories(category_id,name,image_url,icon,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.params.id,name,b.imageUrl||null,b.icon||null,b.isActive!==false,Number(b.sortOrder||0)]);
  res.status(201).json({subcategory:rows[0]});
}catch(e){next(e)}});

router.patch('/admin/subcategories/:id',requireAuth,admin,async(req,res,next)=>{try{
  const b=req.body||{},{rows}=await pool.query(`UPDATE marketplace_subcategories SET name=COALESCE($2,name),image_url=$3,icon=$4,is_active=COALESCE($5,is_active),sort_order=COALESCE($6,sort_order),updated_at=now() WHERE id=$1 RETURNING *`,[req.params.id,b.name?String(b.name).trim():null,b.imageUrl===undefined?null:(b.imageUrl||null),b.icon===undefined?null:(b.icon||null),b.isActive===undefined?null:Boolean(b.isActive),b.sortOrder===undefined?null:Number(b.sortOrder)]);
  if(!rows[0])return res.status(404).json({error:'التصنيف غير موجود'});res.json({subcategory:rows[0]});
}catch(e){next(e)}});

module.exports=router;