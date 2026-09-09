require("dotenv").config();
const pool = require("../database");

async function setupTables() {
  try {
    console.log("🚀 Iniciando creación de tablas para Capacitaciones Operadora...");

    // 1. Tabla principal de Capacitaciones Operadora
    await pool.query(`
      CREATE TABLE IF NOT EXISTS capacitacionesOperadora (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT NULL,
        estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Programada, 2: En Curso, 3: Finalizada, 0: Inactiva',
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_realizacion DATETIME NULL,
        fecha_finalizacion DATETIME NULL,
        usuario_creacion_id INT NOT NULL,
        usuario_actualizacion_id INT NULL,
        creado_por VARCHAR(100) DEFAULT 'sistema',
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado_por VARCHAR(100),
        actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_cap_op_user_creacion FOREIGN KEY (usuario_creacion_id) REFERENCES sys_usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabla capacitacionesOperadora verificada/creada");

    // 2. Tabla de Participantes vinculados por Cédula y Empresa
    await pool.query(`
      CREATE TABLE IF NOT EXISTS capacitacionesOperadora_participantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        capacitacion_id INT NOT NULL,
        cedula VARCHAR(50) NOT NULL,
        empresa_id INT NOT NULL,
        nombre VARCHAR(255) NULL COMMENT 'Respaldo de nombre si no existe registro previo en DB',
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_cap_op_part_cap FOREIGN KEY (capacitacion_id) REFERENCES capacitacionesOperadora(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_cap_op_part_emp FOREIGN KEY (empresa_id) REFERENCES Empresas(Id_empresa) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabla capacitacionesOperadora_participantes verificada/creada");

    // 3. Registrar Submenú en sys_submenus si no existe
    const [menus] = await pool.query(`SELECT id FROM sys_menus WHERE ruta = '/plataforma-comunicaciones' OR nombre LIKE '%Plataforma%' LIMIT 1`);
    const menuId = menus.length ? menus[0].id : 1;

    const [existingSubmenu] = await pool.query(`SELECT id FROM sys_submenus WHERE ruta = '/capacitaciones-operadora'`);
    let submenuId = null;

    if (!existingSubmenu.length) {
      const [insertSub] = await pool.query(`
        INSERT INTO sys_submenus (menu_id, nombre, descripcion, icono, ruta, orden, estado)
        VALUES (?, 'Capacitaciones Operadora', 'Módulo de registro y consulta de capacitaciones informativas', 'school', '/capacitaciones-operadora', 10, 1)
      `, [menuId]);
      submenuId = insertSub.insertId;
      console.log("✅ Submenú 'Capacitaciones Operadora' creado en sys_submenus con id:", submenuId);
    } else {
      submenuId = existingSubmenu[0].id;
      console.log("ℹ️ Submenú 'Capacitaciones Operadora' ya existía con id:", submenuId);
    }

    // 4. Otorgar permisos al Rol Administrador (rol_id = 1)
    const [existingPerm] = await pool.query(`SELECT id FROM sys_rol_permisos WHERE rol_id = 1 AND submenu_id = ?`, [submenuId]);
    if (!existingPerm.length) {
      await pool.query(`
        INSERT INTO sys_rol_permisos (rol_id, menu_id, submenu_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
        VALUES (1, ?, ?, 1, 1, 1, 1)
      `, [menuId, submenuId]);
      console.log("✅ Permisos otorgados al Rol Administrador para Capacitaciones Operadora");
    }

    console.log("🎉 Migración de Capacitaciones Operadora completada con éxito");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante el setup de las tablas de Capacitaciones Operadora:", error);
    process.exit(1);
  }
}

setupTables();
