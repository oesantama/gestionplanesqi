const crypto = require("crypto");

// Clave secreta maestra para encriptación de datos sensibles en reposo (ISO 27001 / BASC)
const SECRET_KEY = process.env.ENCRYPTION_SECRET || "Qinspecting_Secret_ISO27001_BASC_Key_2026";

// Generar clave fija de 32 bytes (256 bits) para AES-256-GCM mediante scrypt
const key = crypto.scryptSync(SECRET_KEY, "qinspect_salt_iso27001_2026", 32);

const ALGORITHM = "aes-256-gcm";
const PREFIX = "ENC:";

/**
 * Cifra un texto plano utilizando AES-256-GCM.
 * Retorna formato autodescriptivo: ENC:<IV_HEX>:<CIPHERTEXT_HEX>:<TAG_HEX>
 */
function encrypt(text) {
  if (text === null || text === undefined || text === "") return text;
  
  const textStr = String(text);
  if (isEncrypted(textStr)) return textStr; // Evitar doble cifrado

  const iv = crypto.randomBytes(12); // 96-bit IV para AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(textStr, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Descifra una cadena formateada como ENC:<IV_HEX>:<CIPHERTEXT_HEX>:<TAG_HEX>.
 * Si la cadena no posee el prefijo ENC:, la retorna sin modificar (compatibilidad retroactiva).
 */
function decrypt(cipherText) {
  if (cipherText === null || cipherText === undefined || cipherText === "") return cipherText;

  const textStr = String(cipherText);
  if (!isEncrypted(textStr)) return textStr; // Texto no cifrado

  try {
    const raw = textStr.substring(PREFIX.length);
    const parts = raw.split(":");

    if (parts.length !== 3) return textStr;

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("⚠️ Error descifrando campo sensible:", error.message);
    return textStr;
  }
}

/**
 * Verifica si un texto ya se encuentra cifrado con el prefijo oficial
 */
function isEncrypted(text) {
  return typeof text === "string" && text.startsWith(PREFIX);
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted
};
