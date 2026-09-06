const jwt=require('jsonwebtoken');const {pool}=require('./db');
const SENSITIVE=/password|secret|token|authorization|otp|code/i;
function safeMeta(value){if(!value||typeof value!=='object')return null;const out={};for(const [k,v] of Object.entries(value)){if(SENSITIVE.test(k))out[k]='[REDACTED]';else if(typeof v==='string')out[k]=v.length>160?v.slice(0,160)+'…':v;else if(v===null||typeof v==='number'||typeof v==='boolean')out[k]=v;else if(Array.isArray(v))out[k]={type:'array',count:v.length};else out[k]={type:'object',keys:Object.keys(v).slice(0,20)}}return out}
function auditMiddleware(req,res,next){
 if(req.path.startsWith('/api/admin/audit'))return next();
 const started=Date.now();const token=(req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):null;let actor=null;
 try{if(token&&process.env.JWT_SECRET)actor=jwt.verify(token,process.env.JWT_SECRET)}catch{}
 const requestMeta={body:safeMeta(req.body),query:safeMeta(req.query)};
 const original=res.end;res.end=function(...args){const out=original.apply(this,args);setImmediate(async()=>{try{
   if(!req.path.startsWith('/api'))return;
   let name=null,phone=null,office=null;
   if(actor?.sub){const {rows}=await pool.query('SELECT u.full_name,u.phone,ep.office_id FROM users u LEFT JOIN employee_profiles ep ON ep.user_id=u.id WHERE u.id=$1',[actor.sub]);name=rows[0]?.full_name||null;phone=rows[0]?.phone||null;office=rows[0]?.office_id||null}
   const module=req.path.split('/')[2]||'system',action=req.method+' '+req.path;
   const metadata={...requestMeta,statusCode:res.statusCode,durationMs:Date.now()-started,success:res.statusCode<400};
   await pool.query('INSERT INTO audit_logs(actor_id,actor_role,office_id,action,module,method,path,entity_id,actor_name,actor_phone,ip_address,user_agent,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[actor?.sub||null,actor?.role||null,office,action,module,req.method,req.path,req.params?.id||req.body?.orderId||null,name,phone,req.ip,req.get('user-agent')||null,JSON.stringify(metadata)])
 }catch(e){console.error('Audit log failed',e.message)}});return out};next()
}
module.exports={auditMiddleware};