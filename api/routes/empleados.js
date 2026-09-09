const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { encrypt, decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  // GET /api/empleados - Listar empleados con búsqueda y paginación
  app.get("/api/empleados", verifyActiveSession, async (req, res) => {
    try {
      const search = (req.query.search || "").trim();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = (page - 1) * limit;

      let whereSql = "";
      const params = [];
      if (search) {
        whereSql = `WHERE Primer_Nombre LIKE ? OR Primer_Apellido LIKE ? OR Cargo LIKE ? OR CAST(Cedula AS CHAR) LIKE ?`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM Empleados ${whereSql}`, params);
      const [rows] = await pool.query(
        `SELECT * FROM Empleados ${whereSql} ORDER BY Primer_Nombre ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const decryptedRows = rows.map(emp => ({
        ...emp,
        Email_Corporativo: decrypt(emp.Email_Corporativo),
        Email_Personal: decrypt(emp.Email_Personal)
      }));

      res.json({ rows: decryptedRows, total: countRows[0].total, page, limit });
    } catch (error) {
      console.error("Error al obtener empleados:", error);
      res.status(500).json({ message: "Error al recuperar directorio de empleados" });
    }
  });

  // POST /api/empleados - Registrar empleado
  app.post("/api/empleados", verifyActiveSession, async (req, res) => {
    try {
      const {
        Cedula,
        Primer_Nombre,
        Segundo_Nombre = "",
        Primer_Apellido,
        Segundo_Apellido = "",
        Cargo = "",
        Email_Corporativo = "",
        Email_Personal = "",
        Descripcion_cargo = "",
        Celular = null,
        Fecha_nacimiento = null,
        Rh = "O+",
        Estado_contrato = 1,
        Fecha_Expedicion = null,
        Fecha_Vigencia = null,
        Departamento_area = "General"
      } = req.body || {};

      if (!Cedula || !Primer_Nombre || !Primer_Apellido) {
        return res.status(400).json({ message: "Cédula, Primer Nombre y Primer Apellido son requeridos" });
      }

      await pool.query(
        `INSERT INTO Empleados 
         (Cedula, Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido, Cargo, Email_Corporativo, Email_Personal, Descripcion_cargo, Celular, Fecha_nacimiento, Rh, Estado_contrato, Fecha_Expedicion, Fecha_Vigencia, Departamento_area)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Cedula,
          Primer_Nombre,
          Segundo_Nombre,
          Primer_Apellido,
          Segundo_Apellido,
          Cargo,
          encrypt(Email_Corporativo),
          encrypt(Email_Personal),
          Descripcion_cargo,
          Celular,
          Fecha_nacimiento,
          Rh,
          Estado_contrato,
          Fecha_Expedicion,
          Fecha_Vigencia,
          Departamento_area
        ]
      );

      res.status(201).json({ message: "Empleado registrado exitosamente" });
    } catch (error) {
      console.error("Error al registrar empleado:", error);
      res.status(500).json({ message: "Error interno al registrar empleado" });
    }
  });

  // PUT /api/empleados/:cedula - Actualizar empleado
  app.put("/api/empleados/:cedula", verifyActiveSession, async (req, res) => {
    try {
      const cedula = parseInt(req.params.cedula);
      const {
        Primer_Nombre,
        Segundo_Nombre,
        Primer_Apellido,
        Segundo_Apellido,
        Cargo,
        Email_Corporativo,
        Email_Personal,
        Descripcion_cargo,
        Celular,
        Fecha_nacimiento,
        Rh,
        Estado_contrato,
        Fecha_Expedicion,
        Fecha_Vigencia,
        Departamento_area
      } = req.body || {};

      await pool.query(
        `UPDATE Empleados
         SET Primer_Nombre = ?, Segundo_Nombre = ?, Primer_Apellido = ?, Segundo_Apellido = ?, Cargo = ?, Email_Corporativo = ?, Email_Personal = ?, Descripcion_cargo = ?, Celular = ?, Fecha_nacimiento = ?, Rh = ?, Estado_contrato = ?, Fecha_Expedicion = ?, Fecha_Vigencia = ?, Departamento_area = ?
         WHERE Cedula = ?`,
        [
          Primer_Nombre,
          Segundo_Nombre,
          Primer_Apellido,
          Segundo_Apellido,
          Cargo,
          encrypt(Email_Corporativo),
          encrypt(Email_Personal),
          Descripcion_cargo,
          Celular,
          Fecha_nacimiento,
          Rh,
          Estado_contrato,
          Fecha_Expedicion,
          Fecha_Vigencia,
          Departamento_area,
          cedula
        ]
      );

      res.json({ message: "Datos del empleado actualizados" });
    } catch (error) {
      console.error("Error al actualizar empleado:", error);
      res.status(500).json({ message: "Error al actualizar empleado" });
    }
  });

  // DELETE /api/empleados/:cedula - Eliminar empleado
  app.delete("/api/empleados/:cedula", verifyActiveSession, async (req, res) => {
    try {
      const cedula = parseInt(req.params.cedula);
      await pool.query(`DELETE FROM Empleados WHERE Cedula = ?`, [cedula]);
      res.json({ message: "Empleado eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar empleado" });
    }
  });
};
