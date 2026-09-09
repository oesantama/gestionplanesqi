const pool = require("../database");
const bcrypt = require("bcryptjs");

const PASSWORD_EXPIRATION_DAYS = 90; // Validez máxima de 90 días
const WARNING_DAYS = 15; // Aviso previo a 15 días (advertencia al usuario)

/**
 * Valida complejidad de la contraseña (Altos Estándares de Seguridad)
 */
function validatePasswordComplexity(pass) {
  if (!pass || pass.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Z]/.test(pass)) return "La contraseña debe contener al menos una letra mayúscula (A-Z)";
  if (!/[a-z]/.test(pass)) return "La contraseña debe contener al menos una letra minúscula (a-z)";
  if (!/[0-9]/.test(pass)) return "La contraseña debe contener al menos un número (0-9)";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "La contraseña debe contener al menos un carácter especial (!@#$%^&*)";
  return null;
}

/**
 * Calcula días para el vencimiento de la contraseña
 */
function calculatePasswordExpirationInfo(passwordActualizadoEn) {
  const lastUpdate = passwordActualizadoEn ? new Date(passwordActualizadoEn) : new Date();
  const diffMs = Date.now() - lastUpdate.getTime();
  const diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diasParaVencer = Math.max(0, PASSWORD_EXPIRATION_DAYS - diasTranscurridos);

  return {
    dias_transcurridos: diasTranscurridos,
    dias_para_vencer: diasParaVencer,
    password_expirado: (PASSWORD_EXPIRATION_DAYS - diasTranscurridos) <= 0,
    password_por_vencer: diasParaVencer <= WARNING_DAYS && (PASSWORD_EXPIRATION_DAYS - diasTranscurridos) > 0
  };
}

/**
 * Verifica si la nueva contraseña coincide con cualquiera de las últimas 3 contraseñas anteriores
 */
async function checkPasswordReuseHistory(usuarioId, newPassword) {
  const [historyRows] = await pool.query(
    `SELECT password_hash FROM sys_historico_passwords WHERE usuario_id = ? ORDER BY id DESC LIMIT 3`,
    [usuarioId]
  );

  for (const row of historyRows) {
    const match = await bcrypt.compare(newPassword, row.password_hash);
    if (match) {
      const err = new Error("⚠️ Por políticas de seguridad, no puedes reutilizar ninguna de tus últimas 3 contraseñas anteriores.");
      err.status = 400;
      throw err;
    }
  }
}

/**
 * Registra el hash de la nueva contraseña en el histórico y actualiza la fecha en sys_usuarios
 */
async function recordNewPasswordHash(usuarioId, newPasswordHash) {
  await pool.query(
    `INSERT INTO sys_historico_passwords (usuario_id, password_hash) VALUES (?, ?)`,
    [usuarioId, newPasswordHash]
  );

  await pool.query(
    `UPDATE sys_usuarios SET password_hash = ?, password_actualizado_en = NOW() WHERE id = ?`,
    [newPasswordHash, usuarioId]
  );
}

module.exports = {
  PASSWORD_EXPIRATION_DAYS,
  WARNING_DAYS,
  validatePasswordComplexity,
  calculatePasswordExpirationInfo,
  checkPasswordReuseHistory,
  recordNewPasswordHash
};
