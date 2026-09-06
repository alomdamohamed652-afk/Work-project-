const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');

test('full migration script covers every startup migration',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const index=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
 const script=String(pkg.scripts['db:migrate:all']||'');
 const files=[...index.matchAll(/require\('\.\/(migrate[^']+)'\)/g)].map(m=>m[1]+'.js');
 for(const file of files) assert.equal(script.includes(file),true,file+' missing from db:migrate:all');
});

test('canonical order workflow exposes required lifecycle actions',()=>{
 const source=fs.readFileSync(path.join(root,'server/routes/order_workflow.js'),'utf8');
 for(const route of ['/:id/restaurant-decision','/:id/restaurant-status','/driver/available','/:id/claim','/:id/driver-status']) assert.equal(source.includes(route),true,route+' missing');
 assert.equal(source.includes('dispatchPreparingOrders'),true);
});

test('promotion referral migration is idempotent for reward cycles',()=>{
 const source=fs.readFileSync(path.join(root,'server/migrate_promotions_referrals.js'),'utf8');
 assert.equal(source.includes('threshold_cycle'),true);
 assert.equal(source.includes('referral_reward_grants_cycle_unique'),true);
});
