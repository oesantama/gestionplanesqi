const pool = require("../database");
const jwt = require("jsonwebtoken");
const { calculatePasswordExpirationInfo } = require("../helpers/passwordPolicy");

const JWT_SECRET = process.env.JWT_SECRET || "Qinspecting_Secret_Security_Key_2026";

/**
 * Middleware para verificar que el token JWT sea válido Y que la sesión no haya sido suplantada en otro dispositivo
 * Cumple con altos estándares de seguridad sobre control de acceso de sesión única por usuario y expiración de contraseña.
 */
async function verifyActiveSession(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado. Token de sesión no proporcionado.", code: "NO_TOKEN" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar en la Base de Datos el session_id actual y password_actualizado_en del usuario
    const [rows] = await pool.query(
      `SELECT session_id, estado, password_actualizado_en FROM sys_usuarios WHERE id = ?`,
      [decoded.id]
    );

    if (!rows.length || rows[0].estado !== 1) {
      return res.status(403).json({ message: "Usuario inactivo o no encontrado", code: "ACCOUNT_DISABLED" });
    }

    const dbUser = rows[0];

    // Control de Sesión Única: Si el session_id en DB es diferente al del Token JWT, se inició sesión en otro dispositivo
    if (dbUser.session_id && dbUser.session_id !== decoded.session_id) {
      return res.status(401).json({
        message: "Se ha iniciado sesión desde otro dispositivo o navegador. Tu sesión anterior ha sido inhabilitada por seguridad.",
        code: "SESSION_SUPERSEDED"
      });
    }

    // Control Expiración Contraseña (90 días)
    const expInfo = calculatePasswordExpirationInfo(dbUser.password_actualizado_en);
    req.user = {
      ...decoded,
      ...expInfo
    };

    const isExemptRoute = req.path === "/api/auth/change-expired-password" ||
                          req.path === "/api/auth/me" ||
                          req.path === "/api/auth/logout";

    if (expInfo.password_expirado && !isExemptRoute) {
      return res.status(403).json({
        message: "Tu contraseña ha expirado (más de 90 días). Debes actualizarla inmediatamente para poder continuar navegando.",
        code: "PASSWORD_EXPIRED",
        password_expirado: true,
        dias_para_vencer: expInfo.dias_para_vencer
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o sesión expirada", code: "INVALID_TOKEN" });
  }
}

module.exports = {
  JWT_SECRET,
  verifyActiveSession
};
