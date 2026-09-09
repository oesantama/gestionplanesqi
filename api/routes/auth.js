const pool = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { JWT_SECRET, verifyActiveSession } = require("../middleware/authMiddleware");

// Helper para registrar eventos de auditoría inalterables (Estándares de Seguridad)
async function registrarBitacora(usuarioId, username, evento, detalles, req) {
  try {
    const ipOrigen = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Desconocido";
    await pool.query(
      `INSERT INTO sys_bitacora_seguridad (usuario_id, username, evento, detalles, ip_origen, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, username, evento, JSON.stringify(detalles), ipOrigen, userAgent]
    );
  } catch (err) {
    console.error("⚠️ Error registrando bitacora de seguridad:", err);
  }
}

const { calculatePasswordExpirationInfo, validatePasswordComplexity, checkPasswordReuseHistory, recordNewPasswordHash } = require("../helpers/passwordPolicy");
const { encrypt, decrypt } = require("../helpers/encryption");

module.exports = (app) => {
  app.verifyActiveSession = verifyActiveSession;

  // GET /api/auth/ping - Endpoint de diagnóstico de salud y conectividad de la API
  app.get("/api/auth/ping", (req, res) => {
    return res.json({ ok: true, timestamp: new Date().toISOString(), service: "QI-API", message: "API activa y respondiendo correctamente" });
  });

  // POST /api/auth/login - Autenticación segura con bcrypt, sesión única por dispositivo y auditoría
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ message: "Usuario/correo y contraseña son requeridos" });
      }

      // Buscar usuario por username o email encriptado
      const [allUsers] = await pool.query(
        `SELECT u.*, r.codigo AS rol_codigo, r.nombre AS rol_nombre 
         FROM sys_usuarios u
         INNER JOIN sys_roles r ON u.rol_id = r.id`
      );

      const rows = allUsers.filter(u => u.username === username || decrypt(u.email) === username || u.email === encrypt(username));

      if (!rows.length) {
        await registrarBitacora(null, username, "LOGIN_FALLIDO_USUARIO_NO_EXISTE", { username }, req);
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const user = rows[0];

      // Verificar si la cuenta está bloqueada por intentos fallidos
      if (user.estado === 2 || (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date())) {
        await registrarBitacora(user.id, user.username, "LOGIN_BLOQUEADO", { motivo: "Cuenta bloqueada por políticas de seguridad" }, req);
        return res.status(403).json({ message: "Cuenta temporariamente bloqueada por seguridad. Contacta al administrador." });
      }

      if (user.estado === 0) {
        return res.status(403).json({ message: "Tu usuario se encuentra inactivo" });
      }

      // Comparación segura del hash bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
        let queryUpdate = `UPDATE sys_usuarios SET intentos_fallidos = ?`;
        const paramsUpdate = [nuevosIntentos];

        // Bloqueo tras 5 intentos fallidos (Políticas de Seguridad)
        if (nuevosIntentos >= 5) {
          const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
          queryUpdate += `, estado = 2, bloqueado_hasta = ?`;
          paramsUpdate.push(bloqueadoHasta);
        }

        queryUpdate += ` WHERE id = ?`;
        paramsUpdate.push(user.id);

        await pool.query(queryUpdate, paramsUpdate);
        await registrarBitacora(user.id, user.username, "LOGIN_FALLIDO_PASSWORD", { intentos: nuevosIntentos }, req);

        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // Calcular información de expiración de contraseña (90 días max, aviso a 5 días)
      const expirationInfo = calculatePasswordExpirationInfo(user.password_actualizado_en);

      // Generar nuevo UUID de sesión única para este inicio de sesión
      const newSessionId = crypto.randomUUID();

      await pool.query(
        `UPDATE sys_usuarios SET session_id = ?, intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW() WHERE id = ?`,
        [newSessionId, user.id]
      );

      const payload = {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        nombre_completo: user.nombre_completo,
        email: decrypt(user.email),
        rol_id: user.rol_id,
        rol: user.rol_codigo,
        rol_nombre: user.rol_nombre,
        session_id: newSessionId,
        ...expirationInfo
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });

      await registrarBitacora(user.id, user.username, "LOGIN_EXITOSO", { rol: user.rol_codigo, session_id: newSessionId, expirationInfo }, req);

      res.json({
        message: expirationInfo.password_expirado
          ? "Tu contraseña ha expirado (90 días). Por favor cámbiala inmediatamente."
          : "¡Bienvenido a Qinspecting!",
        token,
        usuario: payload
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ message: "Error interno en el servidor de autenticación" });
    }
  });

  // GET /api/auth/me - Obtener perfil del usuario autenticado
  app.get("/api/auth/me", verifyActiveSession, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT password_actualizado_en FROM sys_usuarios WHERE id = ?`, [req.user.id]);
      const expirationInfo = calculatePasswordExpirationInfo(rows.length ? rows[0].password_actualizado_en : null);
      res.json({ usuario: { ...req.user, ...expirationInfo } });
    } catch (err) {
      res.json({ usuario: req.user });
    }
  });

  // POST /api/auth/change-expired-password - Cambiar contraseña expirada obligatoriamente
  app.post("/api/auth/change-expired-password", verifyActiveSession, async (req, res) => {
    try {
      const userId = req.user.id;
      const { password_actual, password_nueva } = req.body || {};

      if (!password_actual || !password_nueva) {
        return res.status(400).json({ message: "La contraseña actual y la nueva contraseña son requeridas" });
      }

      const [rows] = await pool.query(`SELECT password_hash, username FROM sys_usuarios WHERE id = ?`, [userId]);
      if (!rows.length) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password_actual, user.password_hash);
      if (!match) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta" });
      }

      const complexityError = validatePasswordComplexity(password_nueva);
      if (complexityError) {
        return res.status(400).json({ message: complexityError });
      }

      // Validar que NO sea ninguna de las últimas 3 contraseñas anteriores
      await checkPasswordReuseHistory(userId, password_nueva);

      // Registrar nuevo hash en el histórico y actualizar la fecha
      const newHash = await bcrypt.hash(password_nueva.trim(), 10);
      await recordNewPasswordHash(userId, newHash);

      await registrarBitacora(userId, user.username, "CAMBIO_PASSWORD_EXPIRADA", { motivo: "Renovación obligatoria de contraseña expirada" }, req);

      res.json({ message: "Contraseña actualizada exitosamente. Tu cuenta vuelve a estar plenamente activa." });
    } catch (error) {
      console.error("Error en cambio de contraseña expirada:", error);
      res.status(error.status || 500).json({ message: error.message || "Error interno al actualizar contraseña" });
    }
  });

  // POST /api/auth/forgot-password - Solicitud de recuperación de contraseña
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ message: "El correo es requerido" });
      }

      const [rows] = await pool.query(`SELECT id, username FROM sys_usuarios WHERE email = ?`, [email]);
      if (rows.length) {
        await registrarBitacora(rows[0].id, rows[0].username, "SOLICITUD_RECUPERACION_PASSWORD", { email }, req);
      }

      res.json({ message: "Si el correo existe en el sistema, recibirás un enlace de recuperación." });
    } catch (error) {
      res.status(500).json({ message: "Error procesando solicitud" });
    }
  });
};
