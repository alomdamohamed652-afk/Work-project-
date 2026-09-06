const express=require('express');
const router=express.Router();
const {pool}=require('../db');
const {requireAuth,requireRole}=require('../auth');
const {notifyUser,notifyRole}=require('../push');
const admin=requireRole('admin','staff');
const num=v=>v===undefined||v===null||v===''?null:(Number.isFinite(Number(v))?Number(v):NaN);
router.post('/',requireAuth,requireRole('customer'),async(req,res,next)=>{try{
 const b=req.body||{},description=String(b.description||'').trim(),estimate=num(b.estimatedProductPrice),lat=num(b.placeLatitude),lon=num(b.placeLongitude);
 if(description.length<3)return res.status(400).json({error:'اكتب تفاصيل الطلب بوضوح'});
 if(Number.isNaN(estimate)||estimate<0)return res.status(400).json({error:'السعر التقريبي غير صحيح'});
 if((lat===null)!==(lon===null)||lat!==null&&(lat<-90||lat>90||lon<-180||lon>180))return res.status(400).json({error:'موقع المكان غير صحيح'});
 const {rows}=await pool.query(`INSERT INTO special_orders(customer_id,description,place_name,place_description,place_latitude,place_longitude,estimated_product_price) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.user.id,description,b.placeName?String(b.placeName).trim():null,b.placeDescription?String(b.placeDescription).trim():null,lat,lon,estimate]);
 await notifyRole('admin','طلب خاص جديد','يوجد طلب خاص يحتاج مراجعة وتسعير.','special_order',{specialOrderId:rows[0].id});
 await notifyRole('staff','طلب خاص جديد','يوجد طلب خاص يحتاج مراجعة وتسعير.','special_order',{specialOrderId:rows[0].id});
 res.status(201).json({specialOrder:rows[0]});
}catch(e){next(e)}});

router.get('/mine',requireAuth,requireRole('customer'),async(req,res,next)=>{try{const {rows}=await pool.query('SELECT * FROM special_orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100',[req.user.id]);res.json({specialOrders:rows})}catch(e){next(e)}});
router.get('/admin/all',requireAuth,admin,async(_req,res,next)=>{try{const {rows}=await pool.query(`SELECT s.*,u.full_name customer_name,u.phone customer_phone,r.full_name reviewer_name FROM special_orders s JOIN users u ON u.id=s.customer_id LEFT JOIN users r ON r.id=s.reviewed_by ORDER BY CASE s.status WHEN 'pending_review' THEN 0 WHEN 'priced' THEN 1 ELSE 2 END,s.created_at DESC LIMIT 300`);res.json({specialOrders:rows})}catch(e){next(e)}});
router.patch('/admin/:id/quote',requireAuth,admin,async(req,res,next)=>{try{
 const product=num(req.body?.productPrice),delivery=num(req.body?.deliveryFee);if(!Number.isFinite(product)||product<0||!Number.isFinite(delivery)||delivery<0)return res.status(400).json({error:'أدخل سعر المنتج ورسوم التوصيل بشكل صحيح'});
 const total=Math.round((product+delivery)*100)/100,{rows}=await pool.query(`UPDATE special_orders SET quoted_product_price=$2,quoted_delivery_fee=$3,quoted_total=$4,status='priced',reviewed_by=$5,reviewed_at=now(),updated_at=now() WHERE id=$1 AND status IN ('pending_review','priced') RETURNING *`,[req.params.id,product,delivery,total,req.user.id]);
 if(!rows[0])return res.status(409).json({error:'الطلب لم يعد متاحًا للتسعير'});
 await notifyUser(rows[0].customer_id,'تم تسعير طلبك الخاص','تم تحديد السعر النهائي '+total.toFixed(2)+' ج.م. راجع الطلب وأكد الموافقة.','special_order',{specialOrderId:rows[0].id,status:'priced'});
 res.json({specialOrder:rows[0]});
}catch(e){next(e)}});
router.patch('/admin/:id/status',requireAuth,admin,async(req,res,next)=>{try{const status=String(req.body?.status||'');const allowed=['in_progress','completed','rejected'];if(!allowed.includes(status))return res.status(400).json({error:'الحالة غير صحيحة'});const expected=status==='in_progress'?['customer_confirmed']:status==='completed'?['in_progress']:['pending_review','priced','customer_confirmed'];const {rows}=await pool.query(`UPDATE special_orders SET status=$2,rejection_reason=CASE WHEN $2='rejected' THEN $3 ELSE rejection_reason END,updated_at=now() WHERE id=$1 AND status=ANY($4::text[]) RETURNING *`,[req.params.id,status,req.body?.reason?String(req.body.reason).trim():null,expected]);if(!rows[0])return res.status(409).json({error:'لا يمكن تغيير حالة الطلب حاليًا'});await notifyUser(rows[0].customer_id,status==='in_progress'?'بدأ تنفيذ طلبك':status==='completed'?'اكتمل طلبك الخاص':'تم رفض الطلب الخاص',status==='in_progress'?'بدأت الإدارة تنفيذ طلبك.':status==='completed'?'تم إكمال طلبك الخاص.':'راجع تفاصيل الطلب أو تواصل مع الدعم.','special_order',{specialOrderId:rows[0].id,status});res.json({specialOrder:rows[0]});
}catch(e){next(e)}});

router.patch('/:id/confirm',requireAuth,requireRole('customer'),async(req,res,next)=>{try{const {rows}=await pool.query(`UPDATE special_orders SET status='customer_confirmed',customer_confirmed_at=now(),updated_at=now() WHERE id=$1 AND customer_id=$2 AND status='priced' RETURNING *`,[req.params.id,req.user.id]);if(!rows[0])return res.status(409).json({error:'الطلب غير متاح للتأكيد'});await notifyRole('admin','تم تأكيد طلب خاص','وافق العميل على السعر النهائي.','special_order',{specialOrderId:rows[0].id});res.json({specialOrder:rows[0]})}catch(e){next(e)}});
router.patch('/:id/cancel',requireAuth,requireRole('customer'),async(req,res,next)=>{try{const {rows}=await pool.query(`UPDATE special_orders SET status='cancelled',updated_at=now() WHERE id=$1 AND customer_id=$2 AND status IN ('pending_review','priced') RETURNING *`,[req.params.id,req.user.id]);if(!rows[0])return res.status(409).json({error:'الطلب غير متاح للإلغاء'});res.json({specialOrder:rows[0]})}catch(e){next(e)}});
module.exports=router;