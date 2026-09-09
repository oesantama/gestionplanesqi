const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  // 1. GET /api/capacitaciones-operadora - Listar capacitaciones según rol de usuario
  app.get("/api/capacitaciones-operadora", verifyActiveSession, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.rol_codigo === "ADMIN" || user.rol_id === 1;

      let query = `
        SELECT 
          c.id,
          c.titulo,
          c.descripcion,
          c.estado,
          c.fecha_creacion,
          c.fecha_realizacion,
          c.fecha_finalizacion,
          c.usuario_creacion_id,
          u.nombre_completo AS creador_nombre,
          u.username AS creador_username,
          (SELECT COUNT(*) FROM capacitacionesOperadora_participantes p WHERE p.capacitacion_id = c.id) AS total_participantes
        FROM capacitacionesOperadora c
        LEFT JOIN sys_usuarios u ON c.usuario_creacion_id = u.id
        WHERE c.estado > 0
      `;
      const params = [];

      if (!isAdmin) {
        query += ` AND c.usuario_creacion_id = ?`;
        params.push(user.id);
      }

      query += ` ORDER BY c.fecha_creacion DESC`;

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener capacitaciones operadora:", error);
      res.status(500).json({ message: "Error interno al listar capacitaciones operadora" });
    }
  });

  // 2. GET /api/capacitaciones-operadora/empresas - Obtener empresas maestras del sistema
  app.get("/api/capacitaciones-operadora/empresas", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          Id_empresa AS id_empresa,
          Razon_social AS razon_social,
          nombre_QI AS nombre_qi,
          base,
          estado
        FROM Empresas
        ORDER BY estado DESC, Razon_social ASC
      `);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener empresas para capacitaciones operadora:", error);
      res.status(500).json({ message: "Error al listar empresas" });
    }
  });

  // 3. POST /api/capacitaciones-operadora/empresas - Crear empresa manual si no existe
  app.post("/api/capacitaciones-operadora/empresas", verifyActiveSession, async (req, res) => {
    try {
      const { razon_social, nombre_qi } = req.body || {};
      if (!razon_social || !razon_social.trim()) {
        return res.status(400).json({ message: "La razón social de la empresa es obligatoria" });
      }

      const nombreQiFinal = (nombre_qi && nombre_qi.trim()) || razon_social.trim();

      const [result] = await pool.query(
        `INSERT INTO Empresas (Razon_social, nombre_QI, estado) VALUES (?, ?, 1)`,
        [razon_social.trim(), nombreQiFinal]
      );

      res.status(201).json({
        id_empresa: result.insertId,
        razon_social: razon_social.trim(),
        nombre_qi: nombreQiFinal,
        estado: 1
      });
    } catch (error) {
      console.error("Error al crear empresa manual:", error);
      res.status(500).json({ message: "Error al crear empresa" });
    }
  });

  // 4. GET /api/capacitaciones-operadora/buscar-personal - Buscar personal por cédula/nombre en DB de empresa
  app.get("/api/capacitaciones-operadora/buscar-personal", verifyActiveSession, async (req, res) => {
    try {
      const { empresa_id, query } = req.query || {};
      if (!empresa_id) {
        return res.status(400).json({ message: "El id de empresa es requerido" });
      }

      const [empRows] = await pool.query(`SELECT base, estado FROM Empresas WHERE Id_empresa = ?`, [empresa_id]);
      if (!empRows.length) {
        return res.json([]);
      }

      const emp = empRows[0];
      let dbName = emp.base;
      if (dbName && dbName.startsWith("ENC:")) {
        try { dbName = decrypt(dbName); } catch (e) {}
      }

      if (!dbName || emp.estado !== 1) {
        return res.json([]);
      }

      const searchTerm = `%${(query || "").trim()}%`;
      let resultados = [];

      // A. Probar consulta en la tabla `personal` de la empresa
      try {
        const [cols] = await pool.query(`DESCRIBE \`${dbName}\`.personal`);
        const colNames = cols.map(c => c.Field);

        let cedCol = colNames.includes("numeroDocumento") ? "numeroDocumento" : colNames.includes("Per_Cedula") ? "Per_Cedula" : colNames.includes("cedula") ? "cedula" : "documento";
        let nomCol = colNames.includes("nombres") ? "nombres" : colNames.includes("Per_Nombre") ? "Per_Nombre" : "nombre";
        let apeCol = colNames.includes("apellidos") ? "apellidos" : colNames.includes("Per_Apellido") ? "Per_Apellido" : "apellido";
        let carCol = colNames.includes("Cargo") ? "Cargo" : colNames.includes("cargo") ? "cargo" : null;

        let sql = `
          SELECT 
            ${cedCol} AS cedula,
            CONCAT(COALESCE(${nomCol}, ''), ${colNames.includes(apeCol) ? `' ', COALESCE(${apeCol}, '')` : "''"}) AS nombre
            ${carCol ? `, ${carCol} AS cargo` : ""}
          FROM \`${dbName}\`.personal
          WHERE ${cedCol} LIKE ? OR ${nomCol} LIKE ? ${colNames.includes(apeCol) ? `OR ${apeCol} LIKE ?` : ""}
          LIMIT 20
        `;
        const params = colNames.includes(apeCol) ? [searchTerm, searchTerm, searchTerm] : [searchTerm, searchTerm];
        const [pRows] = await pool.query(sql, params);
        resultados = pRows.map(r => ({
          cedula: String(r.cedula).trim(),
          nombre: (r.nombre || "").trim(),
          cargo: r.cargo || "Personal"
        }));
      } catch (errPersonal) {
        // B. Fallback: Probar consulta en la tabla `Empleados`
        try {
          const [colsE] = await pool.query(`DESCRIBE \`${dbName}\`.Empleados`);
          const colNamesE = colsE.map(c => c.Field);
          let docCol = colNamesE.includes("Documento") ? "Documento" : "cedula";
          let nomCol = colNamesE.includes("Nombre_Completo") ? "Nombre_Completo" : "nombre";

          let sqlE = `
            SELECT ${docCol} AS cedula, ${nomCol} AS nombre
            FROM \`${dbName}\`.Empleados
            WHERE ${docCol} LIKE ? OR ${nomCol} LIKE ?
            LIMIT 20
          `;
          const [eRows] = await pool.query(sqlE, [searchTerm, searchTerm]);
          resultados = eRows.map(r => ({
            cedula: String(r.cedula).trim(),
            nombre: (r.nombre || "").trim(),
            cargo: "Empleado"
          }));
        } catch (errEmp) {}
      }

      res.json(resultados);
    } catch (error) {
      console.error("Error al buscar personal de empresa:", error);
      res.status(500).json({ message: "Error interno al consultar personal" });
    }
  });

  // 5. GET /api/capacitaciones-operadora/:id - Detalle completo de capacitación con participantes
  app.get("/api/capacitaciones-operadora/:id", verifyActiveSession, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = user.rol_codigo === "ADMIN" || user.rol_id === 1;

      const [caps] = await pool.query(`
        SELECT c.*, u.nombre_completo AS creador_nombre
        FROM capacitacionesOperadora c
        LEFT JOIN sys_usuarios u ON c.usuario_creacion_id = u.id
        WHERE c.id = ? AND c.estado > 0
      `, [id]);

      if (!caps.length) {
        return res.status(404).json({ message: "Capacitación no encontrada" });
      }

      const cap = caps[0];

      if (!isAdmin && cap.usuario_creacion_id !== user.id) {
        return res.status(403).json({ message: "No tienes permiso para ver esta capacitación" });
      }

      // Obtener lista de participantes
      const [parts] = await pool.query(`
        SELECT 
          p.id,
          p.capacitacion_id,
          p.cedula,
          p.empresa_id,
          p.nombre AS nombre_respaldo,
          e.Razon_social AS empresa_razon_social,
          e.nombre_QI AS empresa_nombre_qi,
          e.base AS empresa_base
        FROM capacitacionesOperadora_participantes p
        LEFT JOIN Empresas e ON p.empresa_id = e.Id_empresa
        WHERE p.capacitacion_id = ?
      `, [id]);

      // Enriquecer participantes con información de su DB en tiempo real (para Pasabordo)
      const participantesProcesados = [];
      for (const p of parts) {
        let nombreFinal = p.nombre_respaldo || "Sin nombre registrado";
        let cargoFinal = "Personal";

        if (p.empresa_base) {
          let dbName = p.empresa_base;
          if (dbName.startsWith("ENC:")) {
            try { dbName = decrypt(dbName); } catch (e) {}
          }
          if (dbName) {
            try {
              const [cols] = await pool.query(`DESCRIBE \`${dbName}\`.personal`);
              const colNames = cols.map(c => c.Field);
              let cedCol = colNames.includes("numeroDocumento") ? "numeroDocumento" : colNames.includes("Per_Cedula") ? "Per_Cedula" : colNames.includes("cedula") ? "cedula" : "documento";
              let nomCol = colNames.includes("nombres") ? "nombres" : colNames.includes("Per_Nombre") ? "Per_Nombre" : "nombre";
              let apeCol = colNames.includes("apellidos") ? "apellidos" : colNames.includes("Per_Apellido") ? "Per_Apellido" : "apellido";

              const [pSearch] = await pool.query(`
                SELECT 
                  CONCAT(COALESCE(${nomCol}, ''), ${colNames.includes(apeCol) ? `' ', COALESCE(${apeCol}, '')` : "''"}) AS nombre_db
                FROM \`${dbName}\`.personal 
                WHERE ${cedCol} = ?
                LIMIT 1
              `, [p.cedula]);

              if (pSearch.length && pSearch[0].nombre_db.trim()) {
                nombreFinal = pSearch[0].nombre_db.trim();
              }
            } catch (errDb) {}
          }
        }

        participantesProcesados.push({
          id: p.id,
          cedula: p.cedula,
          empresa_id: p.empresa_id,
          empresa_nombre: p.empresa_razon_social || p.empresa_nombre_qi || "Empresa No Asignada",
          nombre: nombreFinal,
          cargo: cargoFinal
        });
      }

      cap.participantes = participantesProcesados;
      res.json(cap);
    } catch (error) {
      console.error("Error al obtener detalle de capacitación:", error);
      res.status(500).json({ message: "Error interno al consultar capacitación" });
    }
  });

  // 6. POST /api/capacitaciones-operadora - Crear capacitación con participantes
  app.post("/api/capacitaciones-operadora", verifyActiveSession, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { titulo, descripcion, fecha_realizacion, fecha_finalizacion, participantes } = req.body || {};

      if (!titulo || !titulo.trim()) {
        connection.release();
        return res.status(400).json({ message: "El título de la capacitación es obligatorio" });
      }

      await connection.beginTransaction();

      const [capResult] = await connection.query(`
        INSERT INTO capacitacionesOperadora 
          (titulo, descripcion, estado, fecha_realizacion, fecha_finalizacion, usuario_creacion_id, creado_por)
        VALUES (?, ?, 1, ?, ?, ?, ?)
      `, [
        titulo.trim(),
        descripcion ? descripcion.trim() : null,
        fecha_realizacion || null,
        fecha_finalizacion || null,
        req.user.id,
        req.user.username
      ]);

      const capacitacionId = capResult.insertId;

      if (Array.isArray(participantes) && participantes.length > 0) {
        for (const part of participantes) {
          if (part.cedula && part.empresa_id) {
            await connection.query(`
              INSERT INTO capacitacionesOperadora_participantes (capacitacion_id, cedula, empresa_id, nombre)
              VALUES (?, ?, ?, ?)
            `, [capacitacionId, String(part.cedula).trim(), part.empresa_id, part.nombre ? part.nombre.trim() : null]);
          }
        }
      }

      await connection.commit();
      connection.release();

      res.status(201).json({ message: "Capacitación creada exitosamente", id: capacitacionId });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Error al crear capacitación operadora:", error);
      res.status(500).json({ message: "Error interno al guardar capacitación" });
    }
  });

  // 7. PUT /api/capacitaciones-operadora/:id - Actualizar capacitación y participantes
  app.put("/api/capacitaciones-operadora/:id", verifyActiveSession, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { titulo, descripcion, estado, fecha_realizacion, fecha_finalizacion, participantes } = req.body || {};
      const user = req.user;
      const isAdmin = user.rol_codigo === "ADMIN" || user.rol_id === 1;

      const [caps] = await connection.query(`SELECT usuario_creacion_id FROM capacitacionesOperadora WHERE id = ? AND estado > 0`, [id]);
      if (!caps.length) {
        connection.release();
        return res.status(404).json({ message: "Capacitación no encontrada" });
      }

      if (!isAdmin && caps[0].usuario_creacion_id !== user.id) {
        connection.release();
        return res.status(403).json({ message: "No tienes permiso para editar esta capacitación" });
      }

      await connection.beginTransaction();

      await connection.query(`
        UPDATE capacitacionesOperadora 
        SET 
          titulo = COALESCE(?, titulo),
          descripcion = ?,
          estado = COALESCE(?, estado),
          fecha_realizacion = ?,
          fecha_finalizacion = ?,
          usuario_actualizacion_id = ?,
          actualizado_por = ?
        WHERE id = ?
      `, [
        titulo ? titulo.trim() : null,
        descripcion ? descripcion.trim() : null,
        estado !== undefined ? estado : null,
        fecha_realizacion || null,
        fecha_finalizacion || null,
        user.id,
        user.username,
        id
      ]);

      if (Array.isArray(participantes)) {
        await connection.query(`DELETE FROM capacitacionesOperadora_participantes WHERE capacitacion_id = ?`, [id]);
        for (const part of participantes) {
          if (part.cedula && part.empresa_id) {
            await connection.query(`
              INSERT INTO capacitacionesOperadora_participantes (capacitacion_id, cedula, empresa_id, nombre)
              VALUES (?, ?, ?, ?)
            `, [id, String(part.cedula).trim(), part.empresa_id, part.nombre ? part.nombre.trim() : null]);
          }
        }
      }

      await connection.commit();
      connection.release();

      res.json({ message: "Capacitación actualizada con éxito" });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Error al actualizar capacitación operadora:", error);
      res.status(500).json({ message: "Error al guardar cambios de la capacitación" });
    }
  });

  // 8. DELETE /api/capacitaciones-operadora/:id - Eliminar (desactivar) capacitación
  app.delete("/api/capacitaciones-operadora/:id", verifyActiveSession, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = user.rol_codigo === "ADMIN" || user.rol_id === 1;

      const [caps] = await pool.query(`SELECT usuario_creacion_id FROM capacitacionesOperadora WHERE id = ? AND estado > 0`, [id]);
      if (!caps.length) {
        return res.status(404).json({ message: "Capacitación no encontrada" });
      }

      if (!isAdmin && caps[0].usuario_creacion_id !== user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta capacitación" });
      }

      await pool.query(`UPDATE capacitacionesOperadora SET estado = 0, actualizado_por = ? WHERE id = ?`, [user.username, id]);
      res.json({ message: "Capacitación eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar capacitación:", error);
      res.status(500).json({ message: "Error al inhabilitar capacitación" });
    }
  });
};
