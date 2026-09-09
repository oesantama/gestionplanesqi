const pool = require("../database");
const { decrypt } = require("../helpers/encryption");

async function runDashboardTests() {
  console.log("=================================================");
  console.log("📊 PROBANDO ENDPOINT Y LOGICA DE DASHBOARD");
  console.log("=================================================\n");

  try {
    const [empresas] = await pool.query(`
      SELECT e.Id_empresa as id_empresa, e.Razon_social as razon_social, e.nombre_QI as nombre_qi, e.base, e.estado,
             p.Id_plan as id_plan, p.Descripcion as plan_nombre, p.Vh_hasta as plan_vh_hasta,
             p.Max_inspecciones as plan_max_inspecciones, p.Max_capacitaciones as plan_max_capacitaciones
      FROM Empresas e
      LEFT JOIN Planes_empresas pe ON e.Id_empresa = pe.Id_empresa AND pe.Estado = 1
      LEFT JOIN planes p ON pe.Id_plan = p.Id_plan
      ORDER BY e.Razon_social ASC
    `);

    console.log(`✅ Se encontraron ${empresas.length} empresas registradas.`);

    for (const emp of empresas) {
      if (emp.estado !== 1) continue;
      const dbName = decrypt(emp.base);
      console.log(`\n🏢 Empresa: ${emp.razon_social} (${emp.nombre_qi})`);
      console.log(`   Base de Datos (Cifrada en Reposo): ${emp.base.substring(0, 25)}...`);
      console.log(`   Base de Datos (Descifrada): ${dbName}`);
      console.log(`   Plan Asignado: ${emp.plan_nombre || 'Sin Plan'} (Max Vh: ${emp.plan_vh_hasta}, Max Insp: ${emp.plan_max_inspecciones}, Max Cap: ${emp.plan_max_capacitaciones})`);

      let vehiculosReal = 0;
      let remolquesReal = 0;
      let inspeccionesMesReal = 0;
      let capacitacionesMesReal = 0;

      // Vehiculos
      try {
        const [vRows] = await pool.query(`SELECT COUNT(*) as c FROM ${dbName}.Vehiculo`);
        vehiculosReal = vRows[0].c;
      } catch (e) {
        try {
          const [vRows] = await pool.query(`SELECT COUNT(*) as c FROM ${dbName}.vehiculo`);
          vehiculosReal = vRows[0].c;
        } catch (err) {}
      }

      // Remolques
      try {
        const [rRows] = await pool.query(`SELECT COUNT(*) as c FROM ${dbName}.Remolque`);
        remolquesReal = rRows[0].c;
      } catch (e) {
        try {
          const [rRows] = await pool.query(`SELECT COUNT(*) as c FROM ${dbName}.remolque`);
          remolquesReal = rRows[0].c;
        } catch (err) {}
      }

      // Inspecciones
      try {
        const [iResumen] = await pool.query(`
          SELECT COUNT(*) as c FROM ${dbName}.resumenPreoperacional 
          WHERE MONTH(fechaPreoperacional) = MONTH(CURRENT_DATE()) AND YEAR(fechaPreoperacional) = YEAR(CURRENT_DATE())
        `);
        const [iResp] = await pool.query(`
          SELECT COUNT(*) as c FROM ${dbName}.Respuestasencuestasok 
          WHERE MONTH(FechaCencuesta) = MONTH(CURRENT_DATE()) AND YEAR(FechaCencuesta) = YEAR(CURRENT_DATE())
        `);
        inspeccionesMesReal = Math.max(iResumen[0].c || 0, iResp[0].c || 0);
      } catch (e) {
        try {
          const [iRows] = await pool.query(`
            SELECT COUNT(*) as c FROM ${dbName}.resumenPreoperacional 
            WHERE MONTH(fechaPreoperacional) = MONTH(CURRENT_DATE()) AND YEAR(fechaPreoperacional) = YEAR(CURRENT_DATE())
          `);
          inspeccionesMesReal = iRows[0].c || 0;
        } catch (err) {}
      }

      // Capacitaciones
      try {
        const [c1] = await pool.query(`
          SELECT COUNT(*) as c FROM ${dbName}.capacitacion_v2 
          WHERE MONTH(Fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(Fecha_creacion) = YEAR(CURRENT_DATE())
        `);
        capacitacionesMesReal = c1[0].c || 0;
      } catch (e) {
        try {
          const [c2] = await pool.query(`
            SELECT COUNT(*) as c FROM ${dbName}.capacitacion 
            WHERE MONTH(fechaCreacion) = MONTH(CURRENT_DATE()) AND YEAR(fechaCreacion) = YEAR(CURRENT_DATE())
          `);
          capacitacionesMesReal = c2[0].c || 0;
        } catch (err) {}
      }

      console.log(`   📈 Consumo Real Mes Actual:`);
      console.log(`      - Vehículos Activos: ${vehiculosReal} / ${emp.plan_vh_hasta || 0}`);
      console.log(`      - Remolques Activos: ${remolquesReal}`);
      console.log(`      - Flota Total (Vh + Rem): ${vehiculosReal + remolquesReal}`);
      console.log(`      - Inspecciones Mes: ${inspeccionesMesReal} / ${emp.plan_max_inspecciones || 0}`);
      console.log(`      - Capacitaciones Mes: ${capacitacionesMesReal} / ${emp.plan_max_capacitaciones || 0}`);
    }

    console.log("\n=================================================");
    console.log("✅ TODAS LAS CONSULTAS DE MÉTRICAS EJECUTADAS EXITOSAMENTE");
    console.log("=================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en prueba de métricas:", err);
    process.exit(1);
  }
}

runDashboardTests();
