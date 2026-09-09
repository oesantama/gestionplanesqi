const pool = require("../database");
const bcrypt = require("bcryptjs");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { validatePasswordComplexity, checkPasswordReuseHistory, recordNewPasswordHash, calculatePasswordExpirationInfo } = require("../helpers/passwordPolicy");

module.exports = (app) => {
  // GET /api/perfil - Obtener datos del perfil actual y estado de vencimiento de contraseña
  app.get("/api/perfil", verifyActiveSession, async (req, res) => {
    try {
      const userId = req.user.id;
      const [rows] = await pool.query(
        `SELECT u.id, u.uuid, u.username, u.email, u.nombre_completo, u.rol_id, r.nombre AS rol_nombre, r.codigo AS rol_codigo, u.creado_en, u.ultimo_login, u.password_actualizado_en
         FROM sys_usuarios u
         INNER JOIN sys_roles r ON u.rol_id = r.id
         WHERE u.id = ?`,
        [userId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const expInfo = calculatePasswordExpirationInfo(rows[0].password_actualizado_en);

      res.json({
        ...rows[0],
        ...expInfo
      });
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      res.status(500).json({ message: "Error al recuperar información del perfil" });
    }
  });

  // PUT /api/perfil - Actualizar datos del perfil y contraseña propia
  app.put("/api/perfil", verifyActiveSession, async (req, res) => {
    try {
      const userId = req.user.id;
      const { nombre_completo, email, password_actual, password_nueva } = req.body || {};

      if (!nombre_completo || !email) {
        return res.status(400).json({ message: "Nombre completo y correo electrónico son requeridos" });
      }

      // Obtener datos actuales del usuario
      const [rows] = await pool.query(`SELECT password_hash, username FROM sys_usuarios WHERE id = ?`, [userId]);
      if (!rows.length) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const user = rows[0];

      // Si el usuario solicitó cambio de contraseña
      if (password_nueva && password_nueva.trim().length > 0) {
        if (!password_actual) {
          return res.status(400).json({ message: "Para cambiar tu contraseña debes ingresar tu contraseña actual" });
        }

        const match = await bcrypt.compare(password_actual, user.password_hash);
        if (!match) {
          return res.status(401).json({ message: "La contraseña actual es incorrecta" });
        }

        const complexityError = validatePasswordComplexity(password_nueva);
        if (complexityError) {
          return res.status(400).json({ message: complexityError });
        }

        // Control ISO 27001 / BASC: Verificar que no sea ninguna de las últimas 3 contraseñas anteriores
        await checkPasswordReuseHistory(userId, password_nueva.trim());

        const newHash = await bcrypt.hash(password_nueva.trim(), 10);
        await recordNewPasswordHash(userId, newHash);
      }

      await pool.query(
        `UPDATE sys_usuarios SET nombre_completo = ?, email = ? WHERE id = ?`,
        [nombre_completo, email, userId]
      );

      // Obtener datos actualizados para responder
      const [updatedRows] = await pool.query(
        `SELECT u.id, u.uuid, u.username, u.email, u.nombre_completo, u.rol_id, r.nombre AS rol_nombre, r.codigo AS rol_codigo
         FROM sys_usuarios u
         INNER JOIN sys_roles r ON u.rol_id = r.id
         WHERE u.id = ?`,
        [userId]
      );

      res.json({
        message: "Perfil actualizado correctamente",
        usuario: updatedRows[0]
      });
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({ message: "Error interno al actualizar el perfil" });
    }
  });
};
