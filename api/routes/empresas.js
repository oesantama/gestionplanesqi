const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { encrypt, decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  // GET /api/empresas - Listar empresas con búsqueda y paginación
  app.get("/api/empresas", verifyActiveSession, async (req, res) => {
    try {
      const search = (req.query.search || "").trim();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = (page - 1) * limit;

      let whereSql = "";
      const params = [];
      if (search) {
        whereSql = `WHERE Razon_social LIKE ? OR nombre_QI LIKE ? OR url_QI LIKE ?`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM Empresas ${whereSql}`, params);
      const [rows] = await pool.query(
        `SELECT * FROM Empresas ${whereSql} ORDER BY Id_empresa DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Descifrar campo sensible 'base' para la respuesta
      const decryptedRows = rows.map(r => ({
        ...r,
        base: decrypt(r.base)
      }));

      res.json({ rows: decryptedRows, total: countRows[0].total, page, limit });
    } catch (error) {
      console.error("Error al obtener empresas:", error);
      res.status(500).json({ message: "Error al recuperar empresas" });
    }
  });

  // POST /api/empresas - Crear nueva empresa
  app.post("/api/empresas", verifyActiveSession, async (req, res) => {
    try {
      const {
        Razon_social,
        Digito_verificacion = 0,
        Direccion = "",
        nombre_QI = "",
        url_QI = "",
        ruta_logo = "",
        descripcion_logo = "",
        base = "",
        estado = 1
      } = req.body || {};

      if (!Razon_social || !nombre_QI) {
        return res.status(400).json({ message: "Razón social y Nombre QI son requeridos" });
      }

      const encryptedBase = encrypt(base);

      const [result] = await pool.query(
        `INSERT INTO Empresas (Razon_social, Digito_verificacion, Direccion, nombre_QI, url_QI, ruta_logo, descripcion_logo, base, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [Razon_social, Digito_verificacion, Direccion, nombre_QI, url_QI, ruta_logo, descripcion_logo, encryptedBase, estado]
      );

      res.status(201).json({ message: "Empresa creada exitosamente", id: result.insertId });
    } catch (error) {
      console.error("Error al crear empresa:", error);
      res.status(500).json({ message: "Error interno al crear empresa" });
    }
  });

  // PUT /api/empresas/:id - Actualizar empresa
  app.put("/api/empresas/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const {
        Razon_social,
        Digito_verificacion,
        Direccion,
        nombre_QI,
        url_QI,
        ruta_logo,
        descripcion_logo,
        base,
        estado
      } = req.body || {};

      const encryptedBase = encrypt(base);

      await pool.query(
        `UPDATE Empresas 
         SET Razon_social = ?, Digito_verificacion = ?, Direccion = ?, nombre_QI = ?, url_QI = ?, ruta_logo = ?, descripcion_logo = ?, base = ?, estado = ?
         WHERE Id_empresa = ?`,
        [Razon_social, Digito_verificacion, Direccion, nombre_QI, url_QI, ruta_logo, descripcion_logo, encryptedBase, estado, id]
      );

      res.json({ message: "Empresa actualizada exitosamente" });
    } catch (error) {
      console.error("Error al actualizar empresa:", error);
      res.status(500).json({ message: "Error interno al actualizar empresa" });
    }
  });

  // PATCH /api/empresas/:id/estado - Alternar estado
  app.patch("/api/empresas/:id/estado", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { estado } = req.body;

      await pool.query(`UPDATE Empresas SET estado = ? WHERE Id_empresa = ?`, [estado ? 1 : 0, id]);
      res.json({ message: "Estado de empresa actualizado" });
    } catch (error) {
      res.status(500).json({ message: "Error al cambiar estado" });
    }
  });
};
