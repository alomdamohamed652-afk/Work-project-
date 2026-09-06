const { pool } = require("./db");

async function migrateSuperAdmin() {
  await pool.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer','driver','restaurant','staff','admin','super_admin'));
  `);

  const primaryPhone = String(process.env.PRIMARY_ADMIN_PHONE || "").replace(/[\\s-]/g, "");
  if (!primaryPhone) {
    console.warn("PRIMARY_ADMIN_PHONE is not configured; role constraint was updated but no bootstrap super admin was changed.");
    return null;
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET role='super_admin', status='active', updated_at=now()
     WHERE phone=$1
     RETURNING id, full_name, phone, role, status`,
    [primaryPhone]
  );

  if (rows[0]) console.log("Super admin configured:", rows[0]);
  else console.warn("PRIMARY_ADMIN_PHONE account was not found; existing super admins remain unchanged.");
  return rows[0] || null;
}

module.exports = migrateSuperAdmin;

if (require.main === module) {
  migrateSuperAdmin()
    .then(() => pool.end())
    .catch(async (e) => {
      console.error("Super admin migration failed:", e);
      await pool.end();
      process.exit(1);
    });
}