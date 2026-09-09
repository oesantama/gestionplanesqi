const pool = require("../database");

async function setup() {
  console.log("🚀 Ejecutando migración de base de datos para política de contraseñas (Expiración e Histórico de 3 Claves)...");

  try {
    // 1. Agregar columna password_actualizado_en a sys_usuarios si no existe
    const [cols] = await pool.query("SHOW COLUMNS FROM sys_usuarios LIKE 'password_actualizado_en'");
    if (!cols.length) {
      await pool.query(`ALTER TABLE sys_usuarios ADD COLUMN password_actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP AFTER password_hash`);
      console.log("✅ Columna 'password_actualizado_en' añadida a 'sys_usuarios'.");
    } else {
      console.log("✅ Columna 'password_actualizado_en' ya existe en 'sys_usuarios'.");
    }

    // 2. Crear tabla sys_historico_passwords
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_historico_passwords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Tabla 'sys_historico_passwords' verificada/creada.");

    // 3. Inicializar histórico para usuarios existentes si no tienen registros en el histórico
    const [users] = await pool.query("SELECT id, password_hash FROM sys_usuarios");
    for (const u of users) {
      const [hist] = await pool.query("SELECT id FROM sys_historico_passwords WHERE usuario_id = ?", [u.id]);
      if (!hist.length && u.password_hash) {
        await pool.query(
          "INSERT INTO sys_historico_passwords (usuario_id, password_hash) VALUES (?, ?)",
          [u.id, u.password_hash]
        );
      }
    }
    console.log("✅ Histórico inicial cargado para usuarios existentes.");

    console.log("🎉 Migración de base de datos completada con ÉXITO.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error durante la migración:", err);
    process.exit(1);
  }
}

setup();
