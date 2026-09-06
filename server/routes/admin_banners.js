const express=require('express');
const router=express.Router();
const {pool}=require('../db');
const {requireAuth,requireRole}=require('../auth');

router.use(requireAuth,requireRole('admin'));

function cleanDate(v){
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const d=new Date(v);
  return Number.isNaN(d.getTime())?undefined:d.toISOString();
}

router.get('/',async(_req,res,next)=>{
  try{
    const {rows}=await pool.query('SELECT * FROM promo_banners ORDER BY sort_order,id');
    res.json({banners:rows});
  }catch(e){next(e)}
});

router.post('/',async(req,res,next)=>{
  try{
    const b=req.body||{};
    const title=String(b.title||'').trim();
    const imageUrl=String(b.imageUrl||'').trim();
    const startsAt=cleanDate(b.startsAt),expiresAt=cleanDate(b.expiresAt);
    if(!title)return res.status(400).json({error:'اكتب عنوان البانر'});
    if(!imageUrl)return res.status(400).json({error:'أضف صورة للبانر'});
    if(startsAt===undefined||expiresAt===undefined)return res.status(400).json({error:'وقت النشر غير صحيح'});
    if(startsAt&&expiresAt&&new Date(expiresAt)<=new Date(startsAt))return res.status(400).json({error:'وقت الانتهاء يجب أن يكون بعد وقت البداية'});
    const {rows}=await pool.query(`INSERT INTO promo_banners(title,subtitle,image_url,action_label,action_route,is_active,sort_order,starts_at,expires_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[
      title,b.subtitle?String(b.subtitle).trim():null,imageUrl,
      b.actionLabel?String(b.actionLabel).trim():null,b.actionRoute?String(b.actionRoute).trim():null,
      b.isActive!==false,Number.isFinite(Number(b.sortOrder))?Number(b.sortOrder):0,startsAt,expiresAt,req.user.id
    ]);
    res.status(201).json({banner:rows[0]});
  }catch(e){next(e)}
});

router.patch('/:id',async(req,res,next)=>{
  try{
    const b=req.body||{};
    const startsAt=b.startsAt===undefined?undefined:cleanDate(b.startsAt);
    const expiresAt=b.expiresAt===undefined?undefined:cleanDate(b.expiresAt);
    if(startsAt===undefined||expiresAt===undefined)return res.status(400).json({error:'وقت النشر غير صحيح'});
    const {rows:currentRows}=await pool.query('SELECT * FROM promo_banners WHERE id=$1',[req.params.id]);
    const current=currentRows[0];
    if(!current)return res.status(404).json({error:'البانر غير موجود'});
    const nextStarts=startsAt===undefined?current.starts_at:startsAt;
    const nextExpires=expiresAt===undefined?current.expires_at:expiresAt;
    if(nextStarts&&nextExpires&&new Date(nextExpires)<=new Date(nextStarts))return res.status(400).json({error:'وقت الانتهاء يجب أن يكون بعد وقت البداية'});
    const {rows}=await pool.query(`UPDATE promo_banners SET
      title=COALESCE($2,title),subtitle=COALESCE($3,subtitle),image_url=COALESCE($4,image_url),
      action_label=COALESCE($5,action_label),action_route=COALESCE($6,action_route),
      is_active=COALESCE($7,is_active),sort_order=COALESCE($8,sort_order),
      starts_at=$9,expires_at=$10,updated_at=now() WHERE id=$1 RETURNING *`,[
      req.params.id,b.title===undefined?null:String(b.title).trim()||null,
      b.subtitle===undefined?null:String(b.subtitle).trim()||null,
      b.imageUrl===undefined?null:String(b.imageUrl).trim()||null,
      b.actionLabel===undefined?null:String(b.actionLabel).trim()||null,
      b.actionRoute===undefined?null:String(b.actionRoute).trim()||null,
      b.isActive===undefined?null:Boolean(b.isActive),
      b.sortOrder===undefined?null:Number(b.sortOrder),
      startsAt===undefined?current.starts_at:startsAt,
      expiresAt===undefined?current.expires_at:expiresAt
    ]);
    res.json({banner:rows[0]});
  }catch(e){next(e)}
});

router.delete('/:id',async(req,res,next)=>{
  try{
    const {rowCount}=await pool.query('DELETE FROM promo_banners WHERE id=$1',[req.params.id]);
    if(!rowCount)return res.status(404).json({error:'البانر غير موجود'});
    res.json({ok:true});
  }catch(e){next(e)}
});

module.exports=router;