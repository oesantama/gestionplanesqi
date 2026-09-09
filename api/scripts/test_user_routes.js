const pool = require("../database");

async function testUserRoutes() {
  console.log("🧪 Verificando tablas de usuarios, roles, permisos y bitácora...");

  try {
    const [users] = await pool.query(`SELECT COUNT(*) as total FROM sys_usuarios`);
    console.log("✅ Conexión sys_usuarios OK. Total usuarios:", users[0].total);

    const [roles] = await pool.query(`SELECT COUNT(*) as total FROM sys_roles`);
    console.log("✅ Conexión sys_roles OK. Total roles:", roles[0].total);

    const [permisos] = await pool.query(`SELECT COUNT(*) as total FROM sys_rol_permisos`);
    console.log("✅ Conexión sys_rol_permisos OK. Total permisos:", permisos[0].total);

    const [bitacora] = await pool.query(`SELECT COUNT(*) as total FROM sys_bitacora_seguridad`);
    console.log("✅ Conexión sys_bitacora_seguridad OK. Total eventos:", bitacora[0].total);

    console.log("🎉 ¡Verificación de tablas de seguridad completada con ÉXITO!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en verificación:", err);
    process.exit(1);
  }
}

testUserRoutes();
