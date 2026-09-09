const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  console.log('🔄 Inicializando tablas normalizadas (3NF) y seguridad ISO 27001 / BASC...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, '../database_setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar sentencias DDL
    await connection.query(sql);

    // Asegurar columna session_id si la tabla ya existía
    try {
      await connection.query(`ALTER TABLE sys_usuarios ADD COLUMN session_id VARCHAR(100) NULL`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }

    console.log('✅ Tablas maestras creadas/verificadas exitosamente (sys_roles, sys_usuarios, sys_menus, sys_submenus, sys_menu_tabs, sys_rol_permisos, sys_bitacora_seguridad).');

    // Generar hash bcrypt real para usuario admin por defecto
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await connection.query(
      `UPDATE sys_usuarios SET password_hash = ? WHERE username = 'admin'`,
      [adminPasswordHash]
    );

    console.log('🔐 Contraseña de usuario por defecto "admin" (admin123) cifrada con bcrypt exitosamente.');
    console.log('🎉 Inicialización de Base de Datos completada con éxito.');
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err);
  } finally {
    await connection.end();
  }
}

initDatabase();
