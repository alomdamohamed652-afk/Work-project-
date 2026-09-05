const express=require("express");
const router=express.Router();
const {pool}=require("../db");
const {requireAuth,requireRole}=require("../auth");
const {notifyUser,notifyUsers,notifyRole}=require("../push");

async function getOrder(id){const {rows}=await pool.query(`SELECT o.*,r.display_name AS restaurant_name,rp.preparation_minutes,c.full_name AS customer_name,c.phone AS customer_phone,d.full_name AS driver_name,d.phone AS driver_phone FROM orders o LEFT JOIN restaurant_profiles r ON r.restaurant_id=o.restaurant_id LEFT JOIN restaurant_profiles rp ON rp.restaurant_id=o.restaurant_id JOIN users c ON c.id=o.customer_id LEFT JOIN users d ON d.id=o.driver_id WHERE o.id=$1`,[id]);return rows[0]||null}
async function settings(){const {rows}=await pool.query(`SELECT key,value FROM platform_settings WHERE key IN ('dispatch.mode','dispatch.driver_id')`);return Object.fromEntries(rows.map(x=>[x.key,x.value]));}
async function customer(order,title,body){if(order?.customer_id)await notifyUser(order.customer_id,title,body,"order",{orderId:order.id,status:order.status});}
async function dispatchReady(order){const s=await settings();const mode=s["dispatch.mode"]||"active_drivers";
 if(mode==="specific_driver"){
  const driverId=s["dispatch.driver_id"]||"";
  if(!driverId){await notifyRole("admin","تعيين المندوب مطلوب","تم تجهيز الطلب لكن لم يتم اختيار مندوب محدد في إعدادات الإسناد.","order",{orderId:order.id});return;}
  const {rows}=await pool.query(`SELECT id FROM users WHERE id=$1 AND role='driver' AND status='active' AND NOT EXISTS(SELECT 1 FROM orders x WHERE x.driver_id=users.id AND x.status IN ('assigned','picked_up','on_the_way'))`,[driverId]);
  if(!rows[0]){await notifyRole("admin","المندوب المحدد مشغول","الطلب جاهز لكن المندوب المحدد غير متاح حاليًا. يمكن إسناده يدويًا.","order",{orderId:order.id,driverId});return;}
  const {rows:claimed}=await pool.query(`UPDATE orders SET driver_id=$1,status='assigned',updated_at=now() WHERE id=$2 AND driver_id IS NULL AND status='ready' RETURNING *`,[driverId,order.id]);
  if(claimed[0]){const fresh=await getOrder(order.id);await notifyUser(driverId,"طلب جديد مسند إليك","تم إسناد طلب جديد إليك.","order",{orderId:order.id});await customer(fresh,"تم إسناد الطلب","تم إسناد طلبك إلى المندوب وسيبدأ التوصيل قريبًا.");}
  return;
 }
 const where=mode==="all_drivers"?`role='driver' AND status='active'`:`role='driver' AND status='active' AND is_online=true AND is_available=true`;
 const {rows:drivers}=await pool.query(`SELECT id FROM users WHERE ${where}`);
 if(!drivers.length){await customer(order,"لا يوجد مندوب متاح","الطلب جاهز حاليًا، لكن لا يوجد مندوب متاح. سيتم إسناده عند توفر مندوب.");await notifyRole("admin","لا يوجد مندوب متاح","طلب جاهز بدون مندوب متاح حاليًا.","order",{orderId:order.id});return;}
 await notifyUsers(drivers.map(x=>x.id),"طلب جاهز للتوصيل","طلب جاهز الآن ويمكنك استلامه.","order",{orderId:order.id});
 await customer(order,"طلبك جاهز","الطلب أصبح جاهزًا للدليفري وسيتم إسناده عند قبول أحد المندوبين.");
}

router.patch("/:id/restaurant-decision",requireAuth,requireRole("restaurant","admin","staff"),async(req,res,next)=>{try{
 const approve=Boolean(req.body?.approve),reason=String(req.body?.reason||"").trim();if(!approve&&!reason)return res.status(400).json({error:"اكتب سبب الرفض"});const isRestaurant=req.user.role==="restaurant";
 const query=approve
  ?`UPDATE orders SET status='preparing',preparation_started_at=now(),estimated_ready_at=now()+make_interval(mins=>GREATEST(0,(SELECT preparation_minutes FROM restaurant_profiles WHERE restaurant_id=orders.restaurant_id))),reviewed_by=$2,reviewed_at=now(),updated_at=now() WHERE id=$1 AND ${isRestaurant?"restaurant_id=$2 AND ":""}status='restaurant_pending' RETURNING *`
  :`UPDATE orders SET status='restaurant_rejected',restaurant_rejection_reason=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$1 AND ${isRestaurant?"restaurant_id=$3 AND ":""}status='restaurant_pending' RETURNING *`;
 let params=approve?[req.params.id,req.user.id]:[req.params.id,reason,req.user.id];
 const {rows}=await pool.query(query,params);if(!rows[0])return res.status(404).json({error:"الطلب غير متاح لاتخاذ القرار"});const order=await getOrder(req.params.id);
 if(approve){await customer(order,"تم قبول طلبك","المطعم بدأ تجهيز الطلب الآن.");await notifyRole("admin","بدأ تجهيز طلب","تم قبول الطلب وبدأ تجهيزه.","order",{orderId:order.id,estimatedReadyAt:order.estimated_ready_at});}else await customer(order,"تم رفض طلبك",reason);
 res.json({order});
}catch(e){next(e)}});

router.patch("/:id/admin-decision",requireAuth,requireRole("admin","staff"),async(req,res,next)=>{try{
 const approve=Boolean(req.body?.approve),reason=String(req.body?.reason||"").trim();if(!approve&&!reason)return res.status(400).json({error:"اكتب سبب الرفض"});
 const q=approve?`UPDATE orders SET status='preparing',preparation_started_at=now(),estimated_ready_at=now()+make_interval(mins=>GREATEST(0,(SELECT preparation_minutes FROM restaurant_profiles WHERE restaurant_id=orders.restaurant_id))),reviewed_by=$2,reviewed_at=now(),updated_at=now() WHERE id=$1 AND status='restaurant_pending' RETURNING *`:`UPDATE orders SET status='admin_rejected',admin_rejection_reason=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$1 AND status NOT IN ('delivered','cancelled') RETURNING *`;
 const {rows}=await pool.query(q,approve?[req.params.id,req.user.id]:[req.params.id,reason,req.user.id]);if(!rows[0])return res.status(404).json({error:"الطلب غير متاح"});const order=await getOrder(req.params.id);if(approve)await customer(order,"تمت الموافقة وبدأ التجهيز","بدأ المطعم تجهيز طلبك الآن.");else await customer(order,"تم رفض طلبك من الإدارة",reason);res.json({order});
}catch(e){next(e)}});

router.patch("/:id/restaurant-status",requireAuth,requireRole("restaurant"),async(req,res,next)=>{try{
 const nextStatus=String(req.body?.status||"");if(nextStatus!=="ready")return res.status(400).json({error:"الحالة الوحيدة المطلوبة بعد القبول هي جاهز"});
 const {rows}=await pool.query(`UPDATE orders SET status='ready',updated_at=now() WHERE id=$1 AND restaurant_id=$2 AND status='preparing' RETURNING *`,[req.params.id,req.user.id]);if(!rows[0])return res.status(400).json({error:"لا يمكن جعل الطلب جاهزًا بهذه الطريقة"});
 const order=await getOrder(req.params.id);await customer(order,"طلبك جاهز","المطعم أنهى تجهيز طلبك.");await dispatchReady(order);res.json({order:await getOrder(req.params.id)});
}catch(e){next(e)}});

router.get("/driver/available",requireAuth,requireRole("driver"),async(req,res,next)=>{try{
 const s=await settings(),mode=s["dispatch.mode"]||"active_drivers";let allowed=false;if(mode==="specific_driver")allowed=String(s["dispatch.driver_id"]||"")===String(req.user.id);else if(mode==="all_drivers")allowed=true;else {const {rows}=await pool.query(`SELECT id FROM users WHERE id=$1 AND status='active' AND role='driver' AND is_online=true AND is_available=true`,[req.user.id]);allowed=Boolean(rows[0]);}
 if(!allowed)return res.json({orders:[]});const {rows}=await pool.query(`SELECT o.id,o.status,o.restaurant_id,o.checkout_id,o.delivery_latitude,o.delivery_longitude,o.delivery_address,o.total_amount,o.created_at,o.updated_at,c.full_name AS customer_name,c.phone AS customer_phone,(SELECT json_agg(oi ORDER BY oi.created_at) FROM order_items oi WHERE oi.order_id=o.id) AS items FROM orders o JOIN users c ON c.id=o.customer_id WHERE o.driver_id IS NULL AND o.status='ready' ORDER BY o.created_at ASC LIMIT 100`);res.json({orders:rows});
}catch(e){next(e)}});

router.patch("/:id/claim",requireAuth,requireRole("driver"),async(req,res,next)=>{try{
 const s=await settings(),mode=s["dispatch.mode"]||"active_drivers";let condition="";if(mode==="specific_driver")condition=`AND $1=(SELECT value::uuid FROM platform_settings WHERE key='dispatch.driver_id' LIMIT 1) AND EXISTS(SELECT 1 FROM users u WHERE u.id=$1 AND u.role='driver' AND u.status='active')`;else if(mode==="all_drivers")condition=`AND EXISTS(SELECT 1 FROM users u WHERE u.id=$1 AND u.role='driver' AND u.status='active')`;else condition=`AND EXISTS(SELECT 1 FROM users u WHERE u.id=$1 AND u.role='driver' AND u.status='active' AND u.is_online=true AND u.is_available=true)`;
 const {rows}=await pool.query(`UPDATE orders SET driver_id=$1,status='assigned',updated_at=now() WHERE id=$2 AND driver_id IS NULL AND status='ready' ${condition} RETURNING *`,[req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:"الطلب غير متاح أو أنت غير مسموح لك باستلامه"});const order=await getOrder(req.params.id);await customer(order,"تم إسناد مندوب لطلبك","تم إسناد الطلب للمندوب وسيبدأ التوصيل بعد الاستلام.");res.json({order});
}catch(e){next(e)}});

module.exports=router;
