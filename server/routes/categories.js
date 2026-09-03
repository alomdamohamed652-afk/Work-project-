const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../auth");

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id,name,description,image_url,sort_order,is_active,created_at,updated_at FROM categories WHERE is_active=true ORDER BY sort_order ASC,created_at DESC");
    res.json({ categories: rows });
  } catch (error) { next(error); }
});

router.use(requireAuth, requireRole("admin"));

router.get("/all", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id,name,description,image_url,sort_order,is_active,created_at,updated_at FROM categories ORDER BY sort_order ASC,created_at DESC");
    res.json({ categories: rows });
  } catch (error) { next(error); }
});

router.post("/", async (req,res,next)=>{
  try {
    const name=String(req.body?.name||"").trim();
    if(!name) return res.status(400).json({error:"اسم التصنيف مطلوب"});
    const description=req.body?.description==null?null:String(req.body.description).trim()||null;
    const imageUrl=req.body?.imageUrl==null?null:String(req.body.imageUrl).trim()||null;
    const sortOrder=Number.isInteger(req.body?.sortOrder)?req.body.sortOrder:0;
    const {rows}=await pool.query("INSERT INTO categories(name,description,image_url,sort_order) VALUES($1,$2,$3,$4) RETURNING id,name,description,image_url,sort_order,is_active,created_at,updated_at",[name,description,imageUrl,sortOrder]);
    res.status(201).json({category:rows[0]});
  } catch(error){next(error);}
});

router.patch("/:id", async(req,res,next)=>{
  try{
    const name=req.body?.name===undefined?null:String(req.body.name).trim();
    if(name==="") return res.status(400).json({error:"اسم التصنيف لا يمكن أن يكون فارغًا"});
    const description=req.body?.description===undefined?null:String(req.body.description).trim()||null;
    const imageUrl=req.body?.imageUrl===undefined?null:String(req.body.imageUrl).trim()||null;
    const sortOrder=req.body?.sortOrder===undefined?null:Number(req.body.sortOrder);
    const isActive=req.body?.isActive===undefined?null:Boolean(req.body.isActive);
    if(sortOrder!==null&&!Number.isInteger(sortOrder)) return res.status(400).json({error:"sortOrder must be an integer"});
    const {rows}=await pool.query(
      "UPDATE categories SET name=COALESCE($1,name),description=CASE WHEN $2 THEN NULL ELSE COALESCE($3,description) END,image_url=CASE WHEN $4 THEN NULL ELSE COALESCE($5,image_url) END,sort_order=COALESCE($6,sort_order),is_active=COALESCE($7,is_active),updated_at=now() WHERE id=$8 RETURNING id,name,description,image_url,sort_order,is_active,created_at,updated_at",
      [name,req.body?.description===null,description,req.body?.imageUrl===null,imageUrl,sortOrder,isActive,req.params.id]);
    if(!rows[0]) return res.status(404).json({error:"Category not found"});
    res.json({category:rows[0]});
  }catch(error){next(error);}
});

router.delete("/:id",async(req,res,next)=>{
  try{
    const {rowCount}=await pool.query("UPDATE categories SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true",[req.params.id]);
    if(!rowCount)return res.status(404).json({error:"Category not found"});
    res.json({success:true});
  }catch(error){next(error);}
});
module.exports=router;