require("dotenv").config();
const pool = require("../database");

async function setupOperadorasTables() {
  try {
    console.log("🚀 Iniciando creación de tablas y relación para Operadoras...");

    // 1. Crear tabla sys_operadoras
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_operadoras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
        creado_por VARCHAR(100) DEFAULT 'sistema',
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado_por VARCHAR(100),
        actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabla sys_operadoras verificada/creada");

    // 2. Insertar registros semilla iniciales en sys_operadoras
    await pool.query(`
      INSERT INTO sys_operadoras (id, nombre, estado) VALUES
      (1, 'Ecopetrol', 1),
      (2, 'Frontera Energy', 1),
      (3, 'GeoPark', 1),
      (4, 'Parex Resources', 1)
      ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
    `);
    console.log("✅ Operadoras semilla insertadas/verificadas");

    // 3. Añadir columna operadora_id a sys_usuarios si no existe
    const [userColumns] = await pool.query(`SHOW COLUMNS FROM sys_usuarios LIKE 'operadora_id'`);
    if (!userColumns.length) {
      await pool.query(`
        ALTER TABLE sys_usuarios ADD COLUMN operadora_id INT NULL AFTER rol_id
      `);
      console.log("✅ Columna operadora_id agregada a sys_usuarios");

      // Intentar agregar FK si no existe
      try {
        await pool.query(`
          ALTER TABLE sys_usuarios ADD CONSTRAINT fk_usuario_operadora 
          FOREIGN KEY (operadora_id) REFERENCES sys_operadoras(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log("✅ Clave foránea fk_usuario_operadora vinculada");
      } catch (fkErr) {
        console.warn("⚠️ Nota FK (puede ya existir):", fkErr.message);
      }
    } else {
      console.log("ℹ️ Columna operadora_id ya existía en sys_usuarios");
    }

    // 4. Registrar Submenú 'Operadoras' en sys_submenus
    const [menus] = await pool.query(`SELECT id FROM sys_menus WHERE ruta = '/configuracion' OR nombre LIKE '%Configuraci%' LIMIT 1`);
    const menuId = menus.length ? menus[0].id : 5;

    const [existingSubmenu] = await pool.query(`SELECT id FROM sys_submenus WHERE ruta = '/configuracion/operadoras'`);
    let submenuId = null;

    if (!existingSubmenu.length) {
      const [insertSub] = await pool.query(`
        INSERT INTO sys_submenus (menu_id, nombre, descripcion, icono, ruta, orden, estado)
        VALUES (?, 'Operadoras', 'Gestión de empresas operadoras del sistema', 'apartment', '/configuracion/operadoras', 4, 1)
      `, [menuId]);
      submenuId = insertSub.insertId;
      console.log("✅ Submenú 'Operadoras' creado en sys_submenus con id:", submenuId);
    } else {
      submenuId = existingSubmenu[0].id;
      console.log("ℹ️ Submenú 'Operadoras' ya existía con id:", submenuId);
    }

    // 5. Permisos para Rol Administrador (rol_id = 1)
    const [existingPerm] = await pool.query(`SELECT id FROM sys_rol_permisos WHERE rol_id = 1 AND submenu_id = ?`, [submenuId]);
    if (!existingPerm.length) {
      await pool.query(`
        INSERT INTO sys_rol_permisos (rol_id, menu_id, submenu_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
        VALUES (1, ?, ?, 1, 1, 1, 1)
      `, [menuId, submenuId]);
      console.log("✅ Permisos otorgados al Rol Administrador para Operadoras");
    }

    console.log("🎉 Setup de Operadoras finalizado con éxito");
    return true;
  } catch (error) {
    console.error("❌ Error durante el setup de Operadoras:", error);
    throw error;
  }
}

if (require.main === module) {
  setupOperadorasTables().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = setupOperadorasTables;
