const pool = require("../database");
const bcrypt = require("bcryptjs");
const {
  validatePasswordComplexity,
  calculatePasswordExpirationInfo,
  checkPasswordReuseHistory,
  recordNewPasswordHash
} = require("../helpers/passwordPolicy");

async function runTests() {
  console.log("=================================================");
  console.log("🧪 EJECUTANDO PRUEBAS DE SEGURIDAD (ISO 27001 / BASC)");
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
    // PRUEBA 1: Validación de Complejidad de Contraseña
    console.log("--- 1. Validación de Complejidad ---");
    assert(validatePasswordComplexity("short") !== null, "Rechaza claves cortas (< 8 caracteres)");
    assert(validatePasswordComplexity("alllowercase123!") !== null, "Rechaza claves sin mayúsculas");
    assert(validatePasswordComplexity("ALLUPPERCASE123!") !== null, "Rechaza claves sin minúsculas");
    assert(validatePasswordComplexity("NoNumberHere!") !== null, "Rechaza claves sin números");
    assert(validatePasswordComplexity("NoSpecialChar123") !== null, "Rechaza claves sin caracteres especiales");
    assert(validatePasswordComplexity("PasswordValida123!") === null, "Acepta clave que cumple todos los criterios");

    // PRUEBA 2: Cálculo de Expiración a 90 Días y Advertencia a 5 Días
    console.log("\n--- 2. Expiración (90 Días) y Aviso Preventivo (5 Días) ---");
    
    // Contraseña actualizada hoy (90 días restantes)
    const infoToday = calculatePasswordExpirationInfo(new Date());
    assert(infoToday.dias_para_vencer >= 89 && infoToday.dias_para_vencer <= 90, "Contraseña de hoy tiene ~90 días restantes");
    assert(infoToday.password_expirado === false, "Contraseña de hoy NO está expirada");
    assert(infoToday.password_por_vencer === false, "Contraseña de hoy NO está por vencer");

    // Contraseña actualizada hace 86 días (4 días restantes -> debe alertar)
    const date86DaysAgo = new Date(Date.now() - 86 * 24 * 60 * 60 * 1000);
    const info86 = calculatePasswordExpirationInfo(date86DaysAgo);
    assert(info86.dias_para_vencer === 4, "Contraseña de hace 86 días tiene 4 días restantes");
    assert(info86.password_por_vencer === true, "Contraseña de hace 86 días está 'por vencer' (<= 5 días)");
    assert(info86.password_expirado === false, "Contraseña de hace 86 días aún no ha expirado");

    // Contraseña actualizada hace 92 días (expirada)
    const date92DaysAgo = new Date(Date.now() - 92 * 24 * 60 * 60 * 1000);
    const info92 = calculatePasswordExpirationInfo(date92DaysAgo);
    assert(info92.dias_para_vencer <= 0, "Contraseña de hace 92 días tiene 0 o menos días restantes");
    assert(info92.password_expirado === true, "Contraseña de hace 92 días ESTÁ EXPIRADA");

    // PRUEBA 3: Control de No Reutilización de las Últimas 3 Contraseñas
    console.log("\n--- 3. Histórico de No Reutilización (Últimas 3 Contraseñas) ---");
    
    // Crear o limpiar usuario de prueba
    const testUsername = "test_iso_user";
    await pool.query("DELETE FROM sys_historico_passwords WHERE usuario_id IN (SELECT id FROM sys_usuarios WHERE username = ?)", [testUsername]);
    await pool.query("DELETE FROM sys_usuarios WHERE username = ?", [testUsername]);

    const initialHash = await bcrypt.hash("Pass1111!", 10);
    const [userRes] = await pool.query(
      `INSERT INTO sys_usuarios (uuid, username, nombre_completo, email, password_hash, rol_id, estado)
       VALUES (UUID(), ?, 'Usuario Test ISO', 'test_iso@qinspecting.com', ?, 1, 1)`,
      [testUsername, initialHash]
    );
    const userId = userRes.insertId;

    // Registrar 1ª clave: Pass1111!
    await recordNewPasswordHash(userId, await bcrypt.hash("Pass1111!", 10));
    // Registrar 2ª clave: Pass2222!
    await recordNewPasswordHash(userId, await bcrypt.hash("Pass2222!", 10));
    // Registrar 3ª clave: Pass3333!
    await recordNewPasswordHash(userId, await bcrypt.hash("Pass3333!", 10));

    // Intentar reutilizar Pass1111! (Es la 1ª de las últimas 3 en histórico) -> DEBE FALLAR
    let pass1FailedAsExpected = false;
    try {
      await checkPasswordReuseHistory(userId, "Pass1111!");
    } catch (err) {
      pass1FailedAsExpected = true;
    }
    assert(pass1FailedAsExpected, "Bloquea reutilización de Pass1111! (está entre las últimas 3)");

    // Intentar reutilizar Pass3333! (Es la 3ª de las últimas 3 en histórico) -> DEBE FALLAR
    let pass3FailedAsExpected = false;
    try {
      await checkPasswordReuseHistory(userId, "Pass3333!");
    } catch (err) {
      pass3FailedAsExpected = true;
    }
    assert(pass3FailedAsExpected, "Bloquea reutilización de Pass3333! (está entre las últimas 3)");

    // Registrar 4ª clave nueva: Pass4444!
    // Ahora las últimas 3 son: Pass2222!, Pass3333!, Pass4444!. La Pass1111! pasa a ser la 4ª más antigua.
    await recordNewPasswordHash(userId, await bcrypt.hash("Pass4444!", 10));

    // Intentar reutilizar Pass1111! ahora -> DEBE SER PERMITIDO
    let pass1AllowedAfter4th = false;
    try {
      await checkPasswordReuseHistory(userId, "Pass1111!");
      pass1AllowedAfter4th = true;
    } catch (err) {
      pass1AllowedAfter4th = false;
    }
    assert(pass1AllowedAfter4th, "Permite reutilizar Pass1111! tras usar una 4ª clave nueva (salió de la ventana de 3)");

    // Limpieza de datos de prueba
    await pool.query("DELETE FROM sys_historico_passwords WHERE usuario_id = ?", [userId]);
    await pool.query("DELETE FROM sys_usuarios WHERE id = ?", [userId]);

    console.log("\n=================================================");
    console.log(`📊 RESUMEN DE PRUEBAS: ${passed} Exitosas | ${failed} Fallidas`);
    console.log("=================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("❌ Error inesperado durante las pruebas:", err);
    process.exit(1);
  }
}

runTests();
