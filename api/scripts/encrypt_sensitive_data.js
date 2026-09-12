const pool = require("../database");
const { encrypt, isEncrypted } = require("../helpers/encryption");

async function migrateEncryption() {
  console.log("=================================================");
  console.log("🔒 INICIANDO MIGRACIÓN Y ENCRIPTACIÓN EN REPOSO (ISO 27001 / BASC)");
  console.log("=================================================\n");

  try {
    // 1. Ampliar tamaño de columnas en MySQL si es necesario
    console.log("--- 1. Ajustando esquema de tablas ---");
    await pool.query("ALTER TABLE Empresas MODIFY base VARCHAR(255)");
    await pool.query("ALTER TABLE sys_usuarios MODIFY email VARCHAR(255)");
    await pool.query("ALTER TABLE Empleados MODIFY Email_Corporativo VARCHAR(255)");
    await pool.query("ALTER TABLE Empleados MODIFY Email_Personal VARCHAR(255)");
    console.log("✅ Esquema de tablas actualizado correctamente.");

    // 2. Columna 'base' en Empresas se mantiene en texto plano para integraciones externas
    console.log("\n--- 2. Verificando columna 'base' en tabla Empresas (se mantiene texto plano) ---");

    // 3. Encriptar columna 'email' en sys_usuarios
    console.log("\n--- 3. Encriptando columna 'email' en tabla sys_usuarios ---");
    const [usuarios] = await pool.query("SELECT id, username, email FROM sys_usuarios");
    let usrCount = 0;

    for (const u of usuarios) {
      if (u.email && !isEncrypted(u.email)) {
        const encryptedEmail = encrypt(u.email);
        await pool.query("UPDATE sys_usuarios SET email = ? WHERE id = ?", [encryptedEmail, u.id]);
        usrCount++;
        console.log(`🔒 [sys_usuarios] Id ${u.id} (${u.username}): '${u.email}' -> '${encryptedEmail.substring(0, 25)}...'`);
      }
    }
    console.log(`✅ ${usrCount} registro(s) de sys_usuarios encriptados.`);

    // 4. Encriptar columnas 'Email_Corporativo' y 'Email_Personal' en Empleados
    console.log("\n--- 4. Encriptando correos en tabla Empleados ---");
    const [empleados] = await pool.query("SELECT Cedula, Primer_Nombre, Primer_Apellido, Email_Corporativo, Email_Personal FROM Empleados");
    let empldCount = 0;

    for (const empld of empleados) {
      const encCorp = encrypt(empld.Email_Corporativo);
      const encPers = encrypt(empld.Email_Personal);

      if ((empld.Email_Corporativo && !isEncrypted(empld.Email_Corporativo)) || (empld.Email_Personal && !isEncrypted(empld.Email_Personal))) {
        await pool.query(
          "UPDATE Empleados SET Email_Corporativo = ?, Email_Personal = ? WHERE Cedula = ?",
          [encCorp, encPers, empld.Cedula]
        );
        empldCount++;
        console.log(`🔒 [Empleados] Cédula ${empld.Cedula} (${empld.Primer_Nombre} ${empld.Primer_Apellido}) encriptado.`);
      }
    }
    console.log(`✅ ${empldCount} registro(s) de Empleados encriptados.`);

    console.log("\n=================================================");
    console.log("✅ MIGRACIÓN DE ENCRIPTACIÓN FINALIZADA CON ÉXITO");
    console.log("=================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error durante la migración de encriptación:", err);
    process.exit(1);
  }
}

migrateEncryption();
