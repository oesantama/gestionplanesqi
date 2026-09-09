const pool = require("../database");

async function testCrudAndLog() {
  console.log("🧪 Ejecutando verificación automatizada de API y Bitácora de Histórico...");

  try {
    // 1. Probar consulta de empresas
    const [empresas] = await pool.query(`SELECT COUNT(*) AS total FROM Empresas`);
    console.log("✅ Conexión Empresas OK. Total empresas:", empresas[0].total);

    // 2. Probar consulta de planes
    const [planes] = await pool.query(`SELECT COUNT(*) AS total FROM planes`);
    console.log("✅ Conexión Planes OK. Total planes:", planes[0].total);

    // 3. Insertar prueba en sys_log_planes_empresas
    const [logInsert] = await pool.query(`
      INSERT INTO sys_log_planes_empresas (id_llave, id_empresa, id_plan, fecha_inicio, fecha_facturacion, estado, accion, detalles, usuario_id, username)
      VALUES (1, 1, 2, CURDATE(), CURDATE(), 1, 'CREACION', '{"prueba":"Verificación automatizada de bitácora ISO 27001"}', 1, 'admin')
    `);
    console.log("✅ Registro en sys_log_planes_empresas OK. Insert ID:", logInsert.insertId);

    // 4. Consultar log
    const [logs] = await pool.query(`SELECT COUNT(*) AS total FROM sys_log_planes_empresas`);
    console.log("✅ Lectura de sys_log_planes_empresas OK. Total registros en bitácora:", logs[0].total);

    console.log("🎉 ¡Todas las pruebas de verificación de base de datos e histórico fueron EXITOSAS!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en verificación:", err);
    process.exit(1);
  }
}

testCrudAndLog();
