const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const setupOperadorasTables = require("../scripts/setup_operadoras_tables");

// Ejecutar verificación de tabla al cargar el módulo en el servidor
setupOperadorasTables().catch(err => console.error("Error al verificar tablas de Operadoras:", err.message));

module.exports = (app) => {
  // GET /api/operadoras - Listar todas las operadoras
  app.get("/api/operadoras", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, nombre, estado, creado_por, creado_en, actualizado_por, actualizado_en 
         FROM sys_operadoras 
         ORDER BY id ASC`
      );
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener operadoras:", error);
      res.status(500).json({ message: "Error al recuperar la lista de operadoras" });
    }
  });

  // POST /api/operadoras - Crear nueva operadora
  app.post("/api/operadoras", verifyActiveSession, async (req, res) => {
    try {
      const { nombre, estado = 1 } = req.body || {};
      const username = req.user?.username || 'sistema';

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ message: "El nombre de la operadora es obligatorio" });
      }

      const [existing] = await pool.query(
        `SELECT id FROM sys_operadoras WHERE LOWER(nombre) = LOWER(?)`,
        [nombre.trim()]
      );

      if (existing.length) {
        return res.status(400).json({ message: "Ya existe una operadora registrada con este nombre" });
      }

      const [result] = await pool.query(
        `INSERT INTO sys_operadoras (nombre, estado, creado_por) VALUES (?, ?, ?)`,
        [nombre.trim(), estado ? 1 : 0, username]
      );

      res.status(201).json({
        message: "Operadora creada exitosamente",
        id: result.insertId,
        nombre: nombre.trim(),
        estado: estado ? 1 : 0
      });
    } catch (error) {
      console.error("Error al crear operadora:", error);
      res.status(500).json({ message: "Error interno al registrar la operadora" });
    }
  });

  // PUT /api/operadoras/:id - Actualizar operadora
  app.put("/api/operadoras/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { nombre, estado } = req.body || {};
      const username = req.user?.username || 'sistema';

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ message: "El nombre de la operadora es obligatorio" });
      }

      // Validar duplicado excluyendo el ID actual
      const [existing] = await pool.query(
        `SELECT id FROM sys_operadoras WHERE LOWER(nombre) = LOWER(?) AND id != ?`,
        [nombre.trim(), id]
      );

      if (existing.length) {
        return res.status(400).json({ message: "Ya existe otra operadora registrada con este nombre" });
      }

      await pool.query(
        `UPDATE sys_operadoras SET nombre = ?, estado = ?, actualizado_por = ?, actualizado_en = NOW() WHERE id = ?`,
        [nombre.trim(), estado ? 1 : 0, username, id]
      );

      res.json({ message: "Operadora actualizada correctamente" });
    } catch (error) {
      console.error("Error al actualizar operadora:", error);
      res.status(500).json({ message: "Error interno al actualizar la operadora" });
    }
  });

  // DELETE /api/operadoras/:id - Desactivar o eliminar operadora
  app.delete("/api/operadoras/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const username = req.user?.username || 'sistema';

      // Verificar si hay usuarios asociados a esta operadora
      const [users] = await pool.query(`SELECT id FROM sys_usuarios WHERE operadora_id = ?`, [id]);
      if (users.length) {
        // En lugar de borrar físicamente, desactivarla para proteger la integridad de usuarios
        await pool.query(
          `UPDATE sys_operadoras SET estado = 0, actualizado_por = ?, actualizado_en = NOW() WHERE id = ?`,
          [username, id]
        );
        return res.json({ message: "Operadora desactivada exitosamente (posee usuarios vinculados)" });
      }

      await pool.query(`DELETE FROM sys_operadoras WHERE id = ?`, [id]);
      res.json({ message: "Operadora eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar operadora:", error);
      res.status(500).json({ message: "Error interno al eliminar operadora" });
    }
  });
};
