const {pool}=require("./db");
async function main(){
  await pool.query(`
    UPDATE orders SET status='restaurant_pending' WHERE status='pending';
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK(status IN ('restaurant_pending','restaurant_rejected','admin_rejected','confirmed','preparing','ready','assigned','picked_up','on_the_way','delivered','cancelled'));
    ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'restaurant_pending';
  `);
  console.log('Order status cleanup migration completed');
}
module.exports=main;
if(require.main===module)main().then(()=>pool.end()).catch(async e=>{console.error('Order status cleanup migration failed:',e);await pool.end();process.exit(1)});