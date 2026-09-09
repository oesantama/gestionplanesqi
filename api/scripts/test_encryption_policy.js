const pool = require("../database");
const { encrypt, decrypt, isEncrypted } = require("../helpers/encryption");

async function testEncryptionPolicy() {
  console.log("=================================================");
  console.log("🧪 PROBANDO POLÍTICA DE CIFRADO EN REPOSO (ISO 27001 / BASC)");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Pruebas Unitarias de Cifrado AES-256-GCM
    console.log("--- 1. Pruebas Unitarias de Algoritmo AES-256-GCM ---");
    const testText = "qinspect_newtmc";
    const encrypted = encrypt(testText);
    assert(isEncrypted(encrypted), `Texto cifrado contiene prefijo oficial 'ENC:': ${encrypted.substring(0, 25)}...`);
    assert(encrypted !== testText, "El texto cifrado difiere completamente del texto plano");

    const decrypted = decrypt(encrypted);
    assert(decrypted === testText, "El texto descifrado coincide exactamente con el texto plano original");

    const plainTextFallback = decrypt("unencrypted_plain_text");
    assert(plainTextFallback === "unencrypted_plain_text", "Retrocompatibilidad: Texto plano no modificado se retorna intacto");

    // 2. Verificación en Base de Datos MySQL
    console.log("\n--- 2. Verificación de Cifrado Físico en Reposo (MySQL) ---");
    const [empresas] = await pool.query("SELECT Id_empresa, Razon_social, base FROM Empresas LIMIT 5");

    let allEncryptedInDb = true;
    for (const emp of empresas) {
      if (!isEncrypted(emp.base)) {
        allEncryptedInDb = false;
        console.error(`❌ Empresa Id ${emp.Id_empresa} (${emp.Razon_social}) no está cifrada: ${emp.base}`);
      } else {
        const decryptedBase = decrypt(emp.base);
        console.log(`🔒 [Empresas DB] Id ${emp.Id_empresa} (${emp.Razon_social}):`);
        console.log(`   - En Reposo (MySQL): '${emp.base.substring(0, 30)}...'`);
        console.log(`   - Descifrado (En Memoria): '${decryptedBase}'`);
      }
    }
    assert(allEncryptedInDb, "Todas las columnas 'base' en la tabla Empresas están verdaderamente cifradas en reposo");

    // 3. Verificación de Cifrado en Usuarios
    console.log("\n--- 3. Verificación de Cifrado en sys_usuarios ---");
    const [usuarios] = await pool.query("SELECT id, username, email FROM sys_usuarios LIMIT 3");
    for (const u of usuarios) {
      assert(isEncrypted(u.email), `Email de usuario '${u.username}' está cifrado en reposo`);
      assert(decrypt(u.email).includes("@"), `Email de usuario '${u.username}' se descifra correctamente: ${decrypt(u.email)}`);
    }

    console.log("\n=================================================");
    console.log(`📊 RESUMEN DE PRUEBAS: ${passed} Exitosas | ${failed} Fallidas`);
    console.log("=================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("❌ Error durante pruebas de encriptación:", err);
    process.exit(1);
  }
}

testEncryptionPolicy();
