const pool = require("../database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { verifyActiveSession } = require("../middleware/authMiddleware");
const { validatePasswordComplexity, checkPasswordReuseHistory, recordNewPasswordHash } = require("../helpers/passwordPolicy");
const { encrypt, decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  // GET /api/usuarios - Listar todos los usuarios del sistema con su rol (3NF)
  app.get("/api/usuarios", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT u.id, u.uuid, u.username, u.email, u.nombre_completo, u.rol_id, 
               r.nombre AS rol_nombre, r.codigo AS rol_codigo,
               u.intentos_fallidos, u.bloqueado_hasta, u.ultimo_login, u.estado, u.creado_en, u.password_actualizado_en
        FROM sys_usuarios u
        INNER JOIN sys_roles r ON u.rol_id = r.id
        ORDER BY u.id ASC
      `);

      const decryptedRows = rows.map(u => ({
        ...u,
        email: decrypt(u.email)
      }));

      res.json(decryptedRows);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ message: "Error al recuperar la lista de usuarios" });
    }
  });

  // POST /api/usuarios - Registrar nuevo usuario con hash bcrypt
  app.post("/api/usuarios", verifyActiveSession, async (req, res) => {
    try {
      const { username, email, password, nombre_completo, rol_id, estado = 1 } = req.body || {};

      if (!username || !email || !password || !nombre_completo || !rol_id) {
        return res.status(400).json({ message: "Todos los campos son obligatorios (usuario, email, contraseña, nombre, rol)" });
      }

      const complexityError = validatePasswordComplexity(password);
      if (complexityError) {
        return res.status(400).json({ message: complexityError });
      }

      const encryptedEmail = encrypt(email);

      // Comprobar si el usuario o email ya existe
      const [allUsers] = await pool.query(`SELECT id, username, email FROM sys_usuarios`);
      const existing = allUsers.filter(u => u.username === username || decrypt(u.email) === email);

      if (existing.length) {
        return res.status(400).json({ message: "El usuario o correo electrónico ya se encuentra registrado" });
      }

      const userUuid = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO sys_usuarios (uuid, username, email, password_hash, nombre_completo, rol_id, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userUuid, username, encryptedEmail, passwordHash, nombre_completo, rol_id, estado]
      );

      const newUserId = result.insertId;
      await recordNewPasswordHash(newUserId, passwordHash);

      res.status(201).json({ message: "Usuario creado exitosamente", id: newUserId });
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ message: "Error interno al crear usuario" });
    }
  });

  // PUT /api/usuarios/:id - Actualizar usuario
  app.put("/api/usuarios/:id", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, email, password, nombre_completo, rol_id, estado } = req.body || {};

      if (!username || !email || !nombre_completo || !rol_id) {
        return res.status(400).json({ message: "Nombre, correo, usuario y rol son requeridos" });
      }

      const encryptedEmail = encrypt(email);

      // Si se proporcionó una nueva contraseña, validar complejidad e histórico de 3 claves
      if (password && password.trim().length > 0) {
        const complexityError = validatePasswordComplexity(password.trim());
        if (complexityError) {
          return res.status(400).json({ message: complexityError });
        }

        await checkPasswordReuseHistory(id, password.trim());

        const newHash = await bcrypt.hash(password.trim(), 10);
        await recordNewPasswordHash(id, newHash);
      }

      await pool.query(
        `UPDATE sys_usuarios SET username = ?, email = ?, nombre_completo = ?, rol_id = ?, estado = ? WHERE id = ?`,
        [username, encryptedEmail, nombre_completo, rol_id, estado, id]
      );

      res.json({ message: "Usuario actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ message: "Error interno al actualizar usuario" });
    }
  });

  // PATCH /api/usuarios/:id/desbloquear - Desbloquear cuenta (BASC / ISO 27001)
  app.patch("/api/usuarios/:id/desbloquear", verifyActiveSession, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await pool.query(
        `UPDATE sys_usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, estado = 1 WHERE id = ?`,
        [id]
      );
      res.json({ message: "Cuenta de usuario desbloqueada exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al desbloquear cuenta" });
    }
  });

  // GET /api/roles - Listar roles de la base de datos
  app.get("/api/roles", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM sys_roles WHERE estado = 1 ORDER BY id ASC`);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Error al recuperar roles" });
    }
  });

  // GET /api/roles/:id/permisos - Obtener permisos asignados por rol
  app.get("/api/roles/:id/permisos", verifyActiveSession, async (req, res) => {
    try {
      const rolId = parseInt(req.params.id);
      const [rows] = await pool.query(`SELECT * FROM sys_rol_permisos WHERE rol_id = ?`, [rolId]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Error al recuperar matriz de permisos" });
    }
  });

  // POST /api/roles/:id/permisos - Guardar matriz de permisos por rol
  app.post("/api/roles/:id/permisos", verifyActiveSession, async (req, res) => {
    try {
      const rolId = parseInt(req.params.id);
      const { permisos = [] } = req.body || {};

      // Limpiar permisos previos de este rol
      await pool.query(`DELETE FROM sys_rol_permisos WHERE rol_id = ?`, [rolId]);

      // Insertar nuevos permisos
      for (const p of permisos) {
        await pool.query(
          `INSERT INTO sys_rol_permisos (rol_id, menu_id, submenu_id, tab_id, puede_ver, puede_crear, puede_editar, puede_eliminar, creado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sistema')`,
          [
            rolId,
            p.menu_id || null,
            p.submenu_id || null,
            p.tab_id || null,
            p.puede_ver ? 1 : 0,
            p.puede_crear ? 1 : 0,
            p.puede_editar ? 1 : 0,
            p.puede_eliminar ? 1 : 0
          ]
        );
      }

      res.json({ message: "Matriz de permisos de rol actualizada correctamente" });
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      res.status(500).json({ message: "Error interno al guardar permisos" });
    }
  });
};
