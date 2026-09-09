const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");

// Helper para guardar registro en sys_log_planes_empresas
async function registrarLogPlanesEmpresas(idLlave, idEmpresa, idPlan, fechaInicio, fechaFacturacion, estado, accion, detalles, req) {
  try {
    const usuarioId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'Sistema';

    await pool.query(
      `INSERT INTO sys_log_planes_empresas 
       (id_llave, id_empresa, id_plan, fecha_inicio, fecha_facturacion, estado, accion, detalles, usuario_id, username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idLlave,
        idEmpresa,
        idPlan,
        fechaInicio || null,
        fechaFacturacion || null,
        estado !== undefined ? estado : 1,
        accion,
        typeof detalles === 'object' ? JSON.stringify(detalles) : detalles,
        usuarioId,
        username
      ]
    );
  } catch (err) {
    console.error("⚠️ Error registrando log en sys_log_planes_empresas:", err);
  }
}

module.exports = (app) => {
  // GET /api/planes-empresas - Listar asignaciones activas con JOIN a Empresas y Planes
  app.get("/api/planes-empresas", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT pe.Id_llave, pe.Id_empresa, pe.Id_plan, pe.Fecha_inicio, pe.Fecha_facturacion, pe.Estado,
               e.Razon_social AS empresa_nombre, e.nombre_QI AS empresa_nombre_qi, e.url_QI AS empresa_url,
               p.Descripcion AS plan_nombre, p.Precio AS plan_precio, p.Max_inspecciones, p.Max_capacitaciones
        FROM Planes_empresas pe
        INNER JOIN Empresas e ON pe.Id_empresa = e.Id_empresa
        INNER JOIN planes p ON pe.Id_plan = p.Id_plan
        ORDER BY pe.Id_llave DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener asignaciones planes-empresas:", error);
      res.status(500).json({ message: "Error al recuperar asignaciones de planes" });
    }
  });

  // GET /api/planes-empresas/log - Consultar la bitácora/histórico completo de movimientos
  app.get("/api/planes-empresas/log", verifyActiveSession, async (req, res) => {
    try {
      const idLlave = req.query.id_llave ? parseInt(req.query.id_llave) : null;
      let whereSql = "";
      const params = [];

      if (idLlave) {
        whereSql = "WHERE l.id_llave = ?";
        params.push(idLlave);
      }

      const [rows] = await pool.query(`
        SELECT l.*, 
               e.Razon_social AS empresa_nombre, e.nombre_QI AS empresa_nombre_qi,
               p.Descripcion AS plan_nombre
        FROM sys_log_planes_empresas l
        LEFT JOIN Empresas e ON l.id_empresa = e.Id_empresa
        LEFT JOIN planes p ON l.id_plan = p.Id_plan
        ${whereSql}
        ORDER BY l.id DESC
        LIMIT 200
      `, params);

      res.json(rows);
    } catch (error) {
      console.error("Error al recuperar log de planes-empresas:", error);
      res.status(500).json({ message: "Error al consultar bitácora de histórico" });
    }
  });

  // POST /api/planes-empresas - Crear/Asignar plan a empresa
  app.post("/api/planes-empresas", verifyActiveSession, async (req, res) => {
    try {
      const { Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado = 1 } = req.body || {};

      if (!Id_empresa || !Id_plan || !Fecha_inicio || !Fecha_facturacion) {
        return res.status(400).json({ message: "Empresa, Plan y Fechas son requeridos" });
      }

      const [result] = await pool.query(
        `INSERT INTO Planes_empresas (Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado)
         VALUES (?, ?, ?, ?, ?)`,
        [Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado]
      );

      const newId = result.insertId;

      // Registrar evento en la bitácora histórica
      await registrarLogPlanesEmpresas(
        newId,
        Id_empresa,
        Id_plan,
        Fecha_inicio,
        Fecha_facturacion,
        Estado,
        'CREACION',
        { nota: 'Asignación inicial de plan a empresa' },
        req
      );

      res.status(201).json({ message: "Plan asignado exitosamente a la empresa", id: newId });
    } catch (error) {
      console.error("Error al asignar plan a empresa:", error);
      res.status(500).json({ message: "Error al guardar asignación de plan" });
    }
  });

  // PUT /api/planes-empresas/:id - Actualizar asignación (Registra movimiento histórico)
  app.put("/api/planes-empresas/:id", verifyActiveSession, async (req, res) => {
    try {
      const idLlave = parseInt(req.params.id);
      const { Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado } = req.body || {};

      // Consultar estado anterior para la bitácora
      const [oldRows] = await pool.query(`SELECT * FROM Planes_empresas WHERE Id_llave = ?`, [idLlave]);
      const oldState = oldRows.length ? oldRows[0] : null;

      await pool.query(
        `UPDATE Planes_empresas 
         SET Id_empresa = ?, Id_plan = ?, Fecha_inicio = ?, Fecha_facturacion = ?, Estado = ?
         WHERE Id_llave = ?`,
        [Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado, idLlave]
      );

      // Registrar evento de modificación en la bitácora histórica
      await registrarLogPlanesEmpresas(
        idLlave,
        Id_empresa,
        Id_plan,
        Fecha_inicio,
        Fecha_facturacion,
        Estado,
        'MODIFICACION',
        { estado_anterior: oldState, nuevo_estado: { Id_empresa, Id_plan, Fecha_inicio, Fecha_facturacion, Estado } },
        req
      );

      res.json({ message: "Asignación actualizada e histórico registrado" });
    } catch (error) {
      console.error("Error al actualizar asignación de plan:", error);
      res.status(500).json({ message: "Error interno al actualizar asignación" });
    }
  });

  // DELETE /api/planes-empresas/:id - Eliminar asignación (Registra movimiento en histórico)
  app.delete("/api/planes-empresas/:id", verifyActiveSession, async (req, res) => {
    try {
      const idLlave = parseInt(req.params.id);
      const [oldRows] = await pool.query(`SELECT * FROM Planes_empresas WHERE Id_llave = ?`, [idLlave]);

      if (oldRows.length) {
        const item = oldRows[0];
        await registrarLogPlanesEmpresas(
          idLlave,
          item.Id_empresa,
          item.Id_plan,
          item.Fecha_inicio,
          item.Fecha_facturacion,
          0,
          'ELIMINACION',
          { datos_eliminados: item },
          req
        );
      }

      await pool.query(`DELETE FROM Planes_empresas WHERE Id_llave = ?`, [idLlave]);
      res.json({ message: "Asignación eliminada y registrada en histórico" });
    } catch (error) {
      console.error("Error al eliminar asignación de plan:", error);
      res.status(500).json({ message: "Error al eliminar asignación" });
    }
  });
};
