const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  // GET /api/dashboard/metrics - Métricas en tiempo real comparando Plan vs Consumo Real de cada Empresa
  app.get("/api/dashboard/metrics", verifyActiveSession, async (req, res) => {
    try {
      // 1. Obtener todas las empresas con su plan activo contratado
      const [empresas] = await pool.query(`
        SELECT 
          e.Id_empresa as id_empresa,
          e.Razon_social as razon_social,
          e.nombre_QI as nombre_qi,
          e.url_QI as url_qi,
          e.ruta_logo,
          e.base,
          e.estado,
          p.Id_plan as id_plan,
          p.Descripcion as plan_nombre,
          p.Vh_desde as plan_vh_desde,
          p.Vh_hasta as plan_vh_hasta,
          p.Precio as plan_precio,
          p.Max_inspecciones as plan_max_inspecciones,
          p.Max_capacitaciones as plan_max_capacitaciones,
          pe.Fecha_inicio as plan_fecha_inicio,
          pe.Fecha_facturacion as plan_fecha_facturacion,
          pe.Estado as plan_estado
        FROM Empresas e
        LEFT JOIN Planes_empresas pe ON e.Id_empresa = pe.Id_empresa AND pe.Estado = 1
        LEFT JOIN planes p ON pe.Id_plan = p.Id_plan
        ORDER BY e.estado DESC, e.Razon_social ASC
      `);

      const metricsList = [];
      let totalVehiculosPlan = 0;
      let totalVehiculosReal = 0;
      let totalRemolquesReal = 0;
      let totalInspeccionesPlan = 0;
      let totalInspeccionesReal = 0;
      let totalCapacitacionesPlan = 0;
      let totalCapacitacionesReal = 0;

      // 2. Para cada empresa, consultar en su base de datos propia
      for (const emp of empresas) {
        const dbName = decrypt(emp.base);
        let rutaLogo = emp.ruta_logo || '';
        if (rutaLogo.startsWith('http://')) {
          rutaLogo = rutaLogo.replace(/^http:\/\//i, 'https://');
        }
        if (rutaLogo) {
          rutaLogo = `/api/empresas/logo-proxy?url=${encodeURIComponent(rutaLogo)}`;
        }

        let vehiculosReal = 0;
        let remolquesReal = 0;
        let inspeccionesMesReal = 0;
        let capacitacionesMesReal = 0;

        if (dbName && emp.estado === 1) {
          // A. Conteo de Vehículos Activos y Remolques
          try {
            const [vCols] = await pool.query(`DESCRIBE \`${dbName}\`.Vehiculo`);
            const vStateCol = vCols.some(c => c.Field === 'Veh_Estado') ? 'Veh_Estado' : vCols.some(c => c.Field === 'estado') ? 'estado' : '1';
            const [vRows] = await pool.query(`SELECT COUNT(*) as c FROM \`${dbName}\`.Vehiculo WHERE ${vStateCol} = 1 OR ${vStateCol} = '1'`);
            vehiculosReal = Number(vRows[0]?.c || 0);
          } catch (e) {}

          try {
            const [rCols] = await pool.query(`DESCRIBE \`${dbName}\`.Remolque`);
            const rStateCol = rCols.some(c => c.Field === 'Remol_Estado') ? 'Remol_Estado' : rCols.some(c => c.Field === 'estado') ? 'estado' : '1';
            const [rRows] = await pool.query(`SELECT COUNT(*) as c FROM \`${dbName}\`.Remolque WHERE ${rStateCol} = 1 OR ${rStateCol} = '1'`);
            remolquesReal = Number(rRows[0]?.c || 0);
          } catch (e) {}

          // Si Tipos_Vehiculos tiene esTraccion, realizar desglose adicional por tipo
          try {
            const [tCols] = await pool.query(`DESCRIBE \`${dbName}\`.Tipos_Vehiculos`);
            if (tCols.some(c => c.Field === 'esTraccion')) {
              const [vCols] = await pool.query(`DESCRIBE \`${dbName}\`.Vehiculo`);
              const vStateCol = vCols.some(c => c.Field === 'Veh_Estado') ? 'Veh_Estado' : vCols.some(c => c.Field === 'estado') ? 'estado' : '1';
              const [tvRows] = await pool.query(`
                SELECT 
                  SUM(CASE WHEN COALESCE(t.esTraccion, 1) = 1 THEN 1 ELSE 0 END) AS vh,
                  SUM(CASE WHEN COALESCE(t.esTraccion, 1) = 0 THEN 1 ELSE 0 END) AS rem
                FROM \`${dbName}\`.Vehiculo v
                LEFT JOIN \`${dbName}\`.Tipos_Vehiculos t ON v.tipoVehiculo = t.idTipoVehiculo OR v.Tv_Id = t.Tv_Id
                WHERE v.${vStateCol} = 1 OR v.${vStateCol} = '1'
              `);
              vehiculosReal = Number(tvRows[0]?.vh || 0);
              remolquesReal += Number(tvRows[0]?.rem || 0);
            }
          } catch (e) {}

          // B. Conteo de Inspecciones Preoperacionales del Mes Actual (resumenPreoperacional)
          try {
            const [pCols] = await pool.query(`DESCRIBE \`${dbName}\`.resumenPreoperacional`);
            const dateColP = pCols.some(c => c.Field === 'fechaPreoperacional') ? 'fechaPreoperacional' : pCols.some(c => c.Field === 'fecha') ? 'fecha' : 'fechaPreoperacional';
            const [iResumen] = await pool.query(`
              SELECT COUNT(*) as c FROM \`${dbName}\`.resumenPreoperacional 
              WHERE MONTH(${dateColP}) = MONTH(CURRENT_DATE()) AND YEAR(${dateColP}) = YEAR(CURRENT_DATE())
            `);
            inspeccionesMesReal = Number(iResumen[0]?.c || 0);
          } catch (e) {
            try {
              const [iResp] = await pool.query(`
                SELECT COUNT(*) as c FROM \`${dbName}\`.Respuestasencuestasok 
                WHERE MONTH(FechaCencuesta) = MONTH(CURRENT_DATE()) AND YEAR(FechaCencuesta) = YEAR(CURRENT_DATE())
              `);
              inspeccionesMesReal = Number(iResp[0]?.c || 0);
            } catch (err) {}
          }

          // C. Conteo de Capacitaciones del Mes Actual (capacitacion_v2 / capacitacion)
          try {
            const [cCols] = await pool.query(`DESCRIBE \`${dbName}\`.capacitacion_v2`);
            const dateColC = cCols.some(c => c.Field === 'Fecha_creacion') ? 'Fecha_creacion' : cCols.some(c => c.Field === 'fechaCreacion') ? 'fechaCreacion' : 'Fecha_creacion';
            const [c1] = await pool.query(`
              SELECT COUNT(*) as c FROM \`${dbName}\`.capacitacion_v2 
              WHERE MONTH(${dateColC}) = MONTH(CURRENT_DATE()) AND YEAR(${dateColC}) = YEAR(CURRENT_DATE())
            `);
            capacitacionesMesReal = Number(c1[0]?.c || 0);
          } catch (e) {
            try {
              const [c2] = await pool.query(`
                SELECT COUNT(*) as c FROM \`${dbName}\`.capacitacion 
                WHERE MONTH(fechaCreacion) = MONTH(CURRENT_DATE()) AND YEAR(fechaCreacion) = YEAR(CURRENT_DATE())
              `);
              capacitacionesMesReal = Number(c2[0]?.c || 0);
            } catch (err) {}
          }
        }

        const maxVh = emp.plan_vh_hasta || 0;
        const maxInsp = emp.plan_max_inspecciones || 0;
        const maxCap = emp.plan_max_capacitaciones || 0;

        const porcVh = maxVh > 0 ? Math.round((vehiculosReal / maxVh) * 100) : 0;
        const porcInsp = maxInsp > 0 ? Math.round((inspeccionesMesReal / maxInsp) * 100) : 0;
        const porcCap = maxCap > 0 ? Math.round((capacitacionesMesReal / maxCap) * 100) : 0;

        let estadoConsumo = emp.estado === 1 ? "NORMAL" : "INACTIVA";
        if (emp.estado === 1) {
          if (porcVh > 100 || porcInsp > 100 || porcCap > 100) {
            estadoConsumo = "EXCEDIDO";
          } else if (porcVh >= 85 || porcInsp >= 85 || porcCap >= 85) {
            estadoConsumo = "ADVERTENCIA";
          }
        }

        metricsList.push({
          id_empresa: emp.id_empresa,
          razon_social: emp.razon_social,
          nombre_qi: emp.nombre_qi,
          url_qi: emp.url_qi,
          ruta_logo: rutaLogo,
          base_datos: dbName,
          estado_empresa: emp.estado,
          plan: {
            id_plan: emp.id_plan,
            nombre: emp.plan_nombre || "Sin Plan Asignado",
            vh_desde: emp.plan_vh_desde || 0,
            vh_hasta: maxVh,
            precio: emp.plan_precio || 0,
            max_inspecciones: maxInsp,
            max_capacitaciones: maxCap,
            fecha_inicio: emp.plan_fecha_inicio,
            fecha_facturacion: emp.plan_fecha_facturacion
          },
          real: {
            vehiculos_activos: vehiculosReal,
            remolques_activos: remolquesReal,
            flota_total: vehiculosReal + remolquesReal,
            inspecciones_mes: inspeccionesMesReal,
            capacitaciones_mes: capacitacionesMesReal
          },
          cumplimiento: {
            porc_vehiculos: porcVh,
            porc_inspecciones: porcInsp,
            porc_capacitaciones: porcCap,
            estado_consumo: estadoConsumo
          }
        });

        if (emp.estado === 1) {
          totalVehiculosPlan += maxVh;
          totalVehiculosReal += vehiculosReal;
          totalRemolquesReal += remolquesReal;
          totalInspeccionesPlan += maxInsp;
          totalInspeccionesReal += inspeccionesMesReal;
          totalCapacitacionesPlan += maxCap;
          totalCapacitacionesReal += capacitacionesMesReal;
        }
      }

      const consolidadoGlobal = {
        empresas_totales: empresas.length,
        empresas_activas: empresas.filter(e => e.estado === 1).length,
        flota: {
          plan_vehiculos: totalVehiculosPlan,
          real_vehiculos: totalVehiculosReal,
          real_remolques: totalRemolquesReal,
          real_total: totalVehiculosReal + totalRemolquesReal,
          porc_cumplimiento: totalVehiculosPlan > 0 ? Math.round((totalVehiculosReal / totalVehiculosPlan) * 100) : 0
        },
        inspecciones: {
          plan_inspecciones: totalInspeccionesPlan,
          real_inspecciones: totalInspeccionesReal,
          porc_cumplimiento: totalInspeccionesPlan > 0 ? Math.round((totalInspeccionesReal / totalInspeccionesPlan) * 100) : 0
        },
        capacitaciones: {
          plan_capacitaciones: totalCapacitacionesPlan,
          real_capacitaciones: totalCapacitacionesReal,
          porc_cumplimiento: totalCapacitacionesPlan > 0 ? Math.round((totalCapacitacionesReal / totalCapacitacionesPlan) * 100) : 0
        }
      };

      res.json({
        consolidado: consolidadoGlobal,
        empresas: metricsList
      });

    } catch (error) {
      console.error("Error al obtener métricas del dashboard:", error);
      res.status(500).json({ message: "Error interno al calcular métricas del dashboard" });
    }
  });
};
