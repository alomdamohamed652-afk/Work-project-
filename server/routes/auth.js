const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { pool } = require("../db");
const { bcrypt, signToken, requireAuth } = require("../auth");

function normalizePhone(value) { return String(value || "").replace(/[\s-]/g, ""); }
function isValidEgyptianPhone(phone) { return /^01\d{9}$/.test(phone); }
function getPrimaryAdminPhone() { const configured=normalizePhone(process.env.PRIMARY_ADMIN_PHONE); return isValidEgyptianPhone(configured)?configured:null; }
function publicUser(user) { const result={...user}; delete result.password_hash; return result; }

router.post("/register-customer", async (req,res) => {
  try {
    const b=req.body||{};
    const fullName=String(b.fullName||"").trim();
    const phone=normalizePhone(b.phone);
    const secondaryPhone=normalizePhone(b.secondaryPhone);
    const email=b.email?String(b.email).trim().toLowerCase():null;
    const password=String(b.password||"");
    const confirmPassword=String(b.confirmPassword||"");
    if(fullName.length<2)return res.status(400).json({error:"اكتب الاسم بالكامل"});
    if(!isValidEgyptianPhone(phone))return res.status(400).json({error:"رقم الهاتف غير صحيح"});
    if(secondaryPhone&&!isValidEgyptianPhone(secondaryPhone))return res.status(400).json({error:"رقم الهاتف الاحتياطي غير صحيح"});
    if(secondaryPhone&&secondaryPhone===phone)return res.status(400).json({error:"رقم الهاتف الاحتياطي يجب أن يكون مختلفًا"});
    if(password.length<8)return res.status(400).json({error:"كلمة المرور يجب أن تكون 8 أحرف على الأقل"});
    if(password!==confirmPassword)return res.status(400).json({error:"تأكيد كلمة المرور غير مطابق"});
    const passwordHash=await bcrypt.hash(password,12);
    const {rows}=await pool.query(`INSERT INTO users
      (full_name,phone,secondary_phone,email,password_hash,role,area,address,building,floor,apartment,address_notes,password_set_at)
      VALUES($1,$2,$3,$4,$5,'customer',$6,$7,$8,$9,$10,$11,now())
      RETURNING id,full_name,phone,secondary_phone,email,role,status,area,address,building,floor,apartment,address_notes,created_at,updated_at,password_set_at`,[
      fullName,phone,secondaryPhone||null,email,passwordHash,
      b.area?String(b.area).trim():null,b.address?String(b.address).trim():null,b.building?String(b.building).trim():null,
      b.floor?String(b.floor).trim():null,b.apartment?String(b.apartment).trim():null,b.addressNotes?String(b.addressNotes).trim():null
    ]);
    const user=rows[0];
    res.status(201).json({user,token:signToken(user),onboardingRequired:true});
  } catch(error){
    if(error.code==="23505")return res.status(409).json({error:"رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل"});
    console.error(error);res.status(500).json({error:"تعذر إنشاء الحساب"});
  }
});

// Kept only as a controlled migration path for accounts created before passwords were introduced.
router.post("/continue",async(req,res)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!isValidEgyptianPhone(phone))return res.status(400).json({error:"رقم الهاتف غير صحيح"});
    const primaryAdminPhone=getPrimaryAdminPhone();
    const isPrimaryAdmin=Boolean(primaryAdminPhone&&phone===primaryAdminPhone);
    const {rows}=await pool.query("SELECT id,full_name,phone,secondary_phone,email,password_hash,role,status,area,address,building,floor,apartment,address_notes,created_at,updated_at,password_set_at FROM users WHERE phone=$1 LIMIT 1",[phone]);
    let user=rows[0];
    if(!user)return res.status(404).json({error:"الحساب غير موجود. اختر إنشاء حساب جديد."});
    if(isPrimaryAdmin&&user.role!=="admin"){
      const result=await pool.query("UPDATE users SET role='admin',status='active',updated_at=now() WHERE id=$1 RETURNING id,full_name,phone,secondary_phone,email,password_hash,role,status,area,address,building,floor,apartment,address_notes,created_at,updated_at,password_set_at",[user.id]);user=result.rows[0];
    }
    if(user.status!=="active")return res.status(403).json({error:"الحساب غير متاح حاليًا"});
    res.json({user:publicUser(user),token:signToken(user),legacy:true});
  }catch(error){console.error(error);res.status(500).json({error:"تعذر تسجيل الدخول"});}
});

router.post("/login",async(req,res)=>{
  try{
    const identifier=String(req.body?.identifier||"").trim();
    const password=String(req.body?.password||"");
    if(!identifier||!password)return res.status(400).json({error:"اكتب رقم الهاتف وكلمة المرور"});
    const value=identifier.toLowerCase();
    const {rows}=await pool.query("SELECT id,full_name,phone,email,password_hash,role,status,area,address,building,floor,apartment,address_notes,password_set_at FROM users WHERE lower(coalesce(email,''))=$1 OR phone=$2 LIMIT 1",[value,normalizePhone(identifier)]);
    const user=rows[0];
    if(!user||user.status!=="active")return res.status(401).json({error:"بيانات الدخول غير صحيحة"});
    if(!user.password_hash||!await bcrypt.compare(password,user.password_hash))return res.status(401).json({error:"بيانات الدخول غير صحيحة"});
    res.json({user:publicUser(user),token:signToken(user)});
  }catch(error){console.error(error);res.status(500).json({error:"تعذر تسجيل الدخول"});}
});

router.patch("/password",requireAuth,async(req,res)=>{
  try{
    const current=String(req.body?.currentPassword||"");
    const password=String(req.body?.password||"");
    const confirm=String(req.body?.confirmPassword||"");
    const {rows}=await pool.query("SELECT password_hash FROM users WHERE id=$1",[req.user.id]);
    if(!rows[0])return res.status(404).json({error:"الحساب غير موجود"});
    if(rows[0].password_hash&&!await bcrypt.compare(current,rows[0].password_hash))return res.status(400).json({error:"كلمة المرور الحالية غير صحيحة"});
    if(password.length<8)return res.status(400).json({error:"كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"});
    if(password!==confirm)return res.status(400).json({error:"تأكيد كلمة المرور غير مطابق"});
    const hash=await bcrypt.hash(password,12);
    await pool.query("UPDATE users SET password_hash=$1,password_set_at=now(),updated_at=now() WHERE id=$2",[hash,req.user.id]);
    res.json({ok:true});
  }catch(error){console.error(error);res.status(500).json({error:"تعذر تغيير كلمة المرور"});}
});

router.get("/me",requireAuth,(req,res)=>res.json({user:req.user}));
module.exports=router;
