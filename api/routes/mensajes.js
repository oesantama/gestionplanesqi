const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");

module.exports = (app) => {
  // GET /api/mensajes - Listar mensajes de aviso de la plataforma
  app.get("/api/mensajes", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM mensajes ORDER BY id_mensaje ASC`);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      res.status(500).json({ message: "Error al recuperar mensajes" });
    }
  });

  // POST /api/mensajes - Crear mensaje
  app.post("/api/mensajes", verifyActiveSession, async (req, res) => {
    try {
      const { Name, Mensaje, Estado = 1 } = req.body || {};
      if (!Name || !Mensaje) {
        return res.status(400).json({ message: "Nombre e icono/identificador son requeridos" });
      }

      const [result] = await pool.query(
        `INSERT INTO mensajes (Name, Mensaje, Estado) VALUES (?, ?, ?)`,
        [Name, Mensaje, Estado]
      );

      res.status(201).json({ message: "Mensaje creado exitosamente", id: result.insertId });
    } catch (error) {
      console.error("Error al crear mensaje:", error);
      res.status(500).json({ message: "Error interno al crear mensaje" });
    }
  });

  // PUT /api/mensajes/:id - Actualizar mensaje
  app.put("/api/mensajes/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { Name, Mensaje, Estado } = req.body || {};

      await pool.query(
        `UPDATE mensajes SET Name = ?, Mensaje = ?, Estado = ? WHERE id_mensaje = ?`,
        [Name, Mensaje, Estado, id]
      );

      res.json({ message: "Mensaje actualizado exitosamente" });
    } catch (error) {
      console.error("Error al actualizar mensaje:", error);
      res.status(500).json({ message: "Error interno al actualizar mensaje" });
    }
  });

  // DELETE /api/mensajes/:id - Eliminar mensaje
  app.delete("/api/mensajes/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await pool.query(`DELETE FROM mensajes WHERE id_mensaje = ?`, [id]);
      res.json({ message: "Mensaje eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar mensaje" });
    }
  });
};
