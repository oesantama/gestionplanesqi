const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");

module.exports = (app) => {
  // GET /api/bitacora - Consultar bitácora inalterable de auditoría (ISO 27001 / BASC)
  app.get("/api/bitacora", verifyActiveSession, async (req, res) => {
    try {
      const search = (req.query.search || "").trim();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = (page - 1) * limit;

      let whereSql = "";
      const params = [];

      if (search) {
        whereSql = "WHERE username LIKE ? OR evento LIKE ? OR ip_origen LIKE ?";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM sys_bitacora_seguridad ${whereSql}`, params);
      const [rows] = await pool.query(
        `SELECT * FROM sys_bitacora_seguridad ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({ rows, total: countRows[0].total, page, limit });
    } catch (error) {
      console.error("Error al consultar bitacora:", error);
      res.status(500).json({ message: "Error al recuperar bitácora de auditoría" });
    }
  });
};
