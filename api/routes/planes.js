const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");

module.exports = (app) => {
  // GET /api/planes - Listar planes QI
  app.get("/api/planes", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM planes ORDER BY Id_plan ASC`);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener planes:", error);
      res.status(500).json({ message: "Error al recuperar planes" });
    }
  });

  // POST /api/planes - Crear plan QI
  app.post("/api/planes", verifyActiveSession, async (req, res) => {
    try {
      const {
        Descripcion,
        Vh_desde = 1,
        Vh_hasta = 50,
        Precio = 0,
        Max_inspecciones = 1000,
        Max_capacitaciones = 5,
        Estado = 1
      } = req.body || {};

      if (!Descripcion) {
        return res.status(400).json({ message: "La descripción del plan es requerida" });
      }

      const [result] = await pool.query(
        `INSERT INTO planes (Descripcion, Vh_desde, Vh_hasta, Precio, Max_inspecciones, Max_capacitaciones, Estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [Descripcion, Vh_desde, Vh_hasta, Precio, Max_inspecciones, Max_capacitaciones, Estado]
      );

      res.status(201).json({ message: "Plan creado exitosamente", id: result.insertId });
    } catch (error) {
      console.error("Error al crear plan:", error);
      res.status(500).json({ message: "Error interno al crear plan" });
    }
  });

  // PUT /api/planes/:id - Actualizar plan QI
  app.put("/api/planes/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { Descripcion, Vh_desde, Vh_hasta, Precio, Max_inspecciones, Max_capacitaciones, Estado } = req.body || {};

      await pool.query(
        `UPDATE planes 
         SET Descripcion = ?, Vh_desde = ?, Vh_hasta = ?, Precio = ?, Max_inspecciones = ?, Max_capacitaciones = ?, Estado = ?
         WHERE Id_plan = ?`,
        [Descripcion, Vh_desde, Vh_hasta, Precio, Max_inspecciones, Max_capacitaciones, Estado, id]
      );

      res.json({ message: "Plan actualizado exitosamente" });
    } catch (error) {
      console.error("Error al actualizar plan:", error);
      res.status(500).json({ message: "Error interno al actualizar plan" });
    }
  });

  // PATCH /api/planes/:id/estado - Alternar estado del plan
  app.patch("/api/planes/:id/estado", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { estado } = req.body;

      await pool.query(`UPDATE planes SET Estado = ? WHERE Id_plan = ?`, [estado ? 1 : 0, id]);
      res.json({ message: "Estado de plan actualizado" });
    } catch (error) {
      res.status(500).json({ message: "Error al cambiar estado" });
    }
  });
};
