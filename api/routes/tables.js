const pool = require("../database");

// Tablas reales de la base qinspect_planesQi que este API expone. Whitelist
// explícita a propósito -- nunca se interpola un nombre de tabla que venga
// del cliente sin validarlo primero contra esta lista (evita inyección SQL
// por nombre de tabla/columna, que no se puede parametrizar con "?").
const ALLOWED_TABLES = ["Empleados", "Empresas", "mensajes", "planes", "Planes_empresas"];

function assertAllowedTable(table) {
  if (!ALLOWED_TABLES.includes(table)) {
    const error = new Error(`Tabla no permitida: ${table}`);
    error.status = 400;
    throw error;
  }
}

async function getColumns(table) {
  const [rows] = await pool.query("SHOW COLUMNS FROM ??", [table]);
  return rows.map((r) => r.Field);
}

async function getPrimaryKey(table) {
  const [rows] = await pool.query("SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'", [table]);
  if (!rows.length) {
    const error = new Error(`La tabla ${table} no tiene llave primaria definida`);
    error.status = 500;
    throw error;
  }
  // Soporta llave primaria compuesta, aunque lo usual acá es una sola columna.
  return rows.map((r) => r.Column_name);
}

module.exports = (app) => {
  // Lista de tablas disponibles (para armar el menú del SPA).
  app.get("/tables", (req, res) => {
    res.json(ALLOWED_TABLES);
  });

  // Columnas reales de una tabla -- para construir el formulario dinámicamente.
  app.get("/tables/:table/columns", async (req, res) => {
    try {
      assertAllowedTable(req.params.table);
      const columns = await getColumns(req.params.table);
      const primaryKey = await getPrimaryKey(req.params.table);
      res.json({ columns, primaryKey });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Listado paginado, con búsqueda opcional across todas las columnas reales.
  app.get("/tables/:table", async (req, res) => {
    try {
      const { table } = req.params;
      assertAllowedTable(table);
      const columns = await getColumns(table);

      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
      const offset = (page - 1) * limit;
      const search = (req.query.search || "").trim();

      let whereSql = "";
      const params = [];
      if (search) {
        const concatCols = columns.map(() => "COALESCE(??, '')").join(", ");
        whereSql = `WHERE CONCAT_WS(' ', ${concatCols}) LIKE ?`;
        columns.forEach((c) => params.push(c));
        params.push(`%${search}%`);
      }

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM ?? ${whereSql}`,
        [table, ...params]
      );
      const [rows] = await pool.query(
        `SELECT * FROM ?? ${whereSql} LIMIT ? OFFSET ?`,
        [table, ...params, limit, offset]
      );

      res.json({ rows, total: countRows[0].total, page, limit });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Crear un registro nuevo -- solo acepta columnas que existan de verdad
  // en la tabla (ignora silenciosamente cualquier otra cosa en el body).
  app.post("/tables/:table", async (req, res) => {
    try {
      const { table } = req.params;
      assertAllowedTable(table);
      const columns = await getColumns(table);
      const data = req.body || {};
      const fields = Object.keys(data).filter((k) => columns.includes(k));
      if (!fields.length) {
        return res.status(400).json({ message: "No se recibió ninguna columna válida para insertar" });
      }
      const placeholders = fields.map(() => "?").join(", ");
      const values = fields.map((f) => data[f]);
      const [result] = await pool.query(
        `INSERT INTO ?? (${fields.map(() => "??").join(", ")}) VALUES (${placeholders})`,
        [table, ...fields, ...values]
      );
      res.status(201).json({ insertId: result.insertId });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Actualizar un registro existente, identificado por su llave primaria real
  // (detectada en la propia base, nunca asumida como "id").
  app.put("/tables/:table/:pk", async (req, res) => {
    try {
      const { table, pk } = req.params;
      assertAllowedTable(table);
      const columns = await getColumns(table);
      const primaryKey = await getPrimaryKey(table);
      if (primaryKey.length !== 1) {
        return res.status(400).json({ message: "Esta tabla tiene llave primaria compuesta; usa /tables/:table con un filtro explícito" });
      }
      const data = req.body || {};
      const fields = Object.keys(data).filter((k) => columns.includes(k) && k !== primaryKey[0]);
      if (!fields.length) {
        return res.status(400).json({ message: "No se recibió ninguna columna válida para actualizar" });
      }
      const setSql = fields.map(() => "?? = ?").join(", ");
      const setParams = fields.flatMap((f) => [f, data[f]]);
      const [result] = await pool.query(
        `UPDATE ?? SET ${setSql} WHERE ?? = ?`,
        [table, ...setParams, primaryKey[0], pk]
      );
      res.json({ affectedRows: result.affectedRows });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Borrar un registro por su llave primaria real.
  app.delete("/tables/:table/:pk", async (req, res) => {
    try {
      const { table, pk } = req.params;
      assertAllowedTable(table);
      const primaryKey = await getPrimaryKey(table);
      if (primaryKey.length !== 1) {
        return res.status(400).json({ message: "Esta tabla tiene llave primaria compuesta; borrado no soportado por este endpoint genérico" });
      }
      const [result] = await pool.query(`DELETE FROM ?? WHERE ?? = ?`, [table, primaryKey[0], pk]);
      res.json({ affectedRows: result.affectedRows });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });
};
