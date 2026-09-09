const pool = require("../database");

async function setup() {
  console.log("🚀 Iniciando actualización de base de datos para CRUDs e Histórico de Planes...");

  try {
    // 1. Crear tabla sys_log_planes_empresas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_log_planes_empresas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_llave INT NOT NULL,
        id_empresa INT NOT NULL,
        id_plan INT NOT NULL,
        fecha_inicio DATE NULL,
        fecha_facturacion DATE NULL,
        estado INT NOT NULL DEFAULT 1,
        accion VARCHAR(50) NOT NULL,
        detalles TEXT NULL,
        usuario_id INT NULL,
        username VARCHAR(100) NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_id_llave (id_llave),
        INDEX idx_id_empresa (id_empresa),
        INDEX idx_id_plan (id_plan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Tabla 'sys_log_planes_empresas' verificada/creada.");

    // 2. Limpiar e Insertar Menús organizados
    // Menú 1: Gestión Comercial & Empresas
    const [existingM1] = await pool.query(`SELECT id FROM sys_menus WHERE nombre LIKE '%Comercial%' OR nombre LIKE '%Empresas%'`);
    let m1Id;
    if (existingM1.length) {
      m1Id = existingM1[0].id;
    } else {
      const [resM1] = await pool.query(`
        INSERT INTO sys_menus (nombre, descripcion, icono, orden, estado) 
        VALUES ('Gestión Comercial', 'Empresas, Planes QI y Asignaciones', 'business', 1, 1)
      `);
      m1Id = resM1.insertId;
    }

    // Submenús para M1
    const submenusM1 = [
      { nombre: 'Empresas', descripcion: 'Gestión de Clientes y Empresas QI', icono: 'domain', ruta: '/empresas', orden: 1 },
      { nombre: 'Planes QI', descripcion: 'Catálogo de Planes y Tarifas', icono: 'card_membership', ruta: '/planes', orden: 2 },
      { nombre: 'Asignación de Planes', descripcion: 'Asignación de planes a empresas e histórico de movimientos', icono: 'assignment', ruta: '/planes-empresas', orden: 3 }
    ];

    for (const sub of submenusM1) {
      const [existingSub] = await pool.query(`SELECT id FROM sys_submenus WHERE ruta = ?`, [sub.ruta]);
      if (!existingSub.length) {
        await pool.query(`
          INSERT INTO sys_submenus (menu_id, nombre, descripcion, icono, ruta, orden, estado)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [m1Id, sub.nombre, sub.descripcion, sub.icono, sub.ruta, sub.orden]);
      }
    }

    // Menú 2: Talento Humano
    const [existingM2] = await pool.query(`SELECT id FROM sys_menus WHERE nombre LIKE '%Talento%' OR nombre LIKE '%Empleados%'`);
    let m2Id;
    if (existingM2.length) {
      m2Id = existingM2[0].id;
    } else {
      const [resM2] = await pool.query(`
        INSERT INTO sys_menus (nombre, descripcion, icono, orden, estado) 
        VALUES ('Talento Humano', 'Gestión de personal y colaboradores', 'badge', 2, 1)
      `);
      m2Id = resM2.insertId;
    }

    const [existingSubEmp] = await pool.query(`SELECT id FROM sys_submenus WHERE ruta = '/empleados'`);
    if (!existingSubEmp.length) {
      await pool.query(`
        INSERT INTO sys_submenus (menu_id, nombre, descripcion, icono, ruta, orden, estado)
        VALUES (?, 'Empleados', 'Directorio de Empleados y Cargos', 'people', '/empleados', 1, 1)
      `, [m2Id]);
    }

    // Menú 3: Comunicaciones & Mensajes
    const [existingM3] = await pool.query(`SELECT id FROM sys_menus WHERE nombre LIKE '%Comunicación%' OR nombre LIKE '%Mensajes%'`);
    let m3Id;
    if (existingM3.length) {
      m3Id = existingM3[0].id;
    } else {
      const [resM3] = await pool.query(`
        INSERT INTO sys_menus (nombre, descripcion, icono, orden, estado) 
        VALUES ('Plataforma & Comunicaciones', 'Mensajes y avisos del sistema', 'campaign', 3, 1)
      `);
      m3Id = resM3.insertId;
    }

    const [existingSubMsg] = await pool.query(`SELECT id FROM sys_submenus WHERE ruta = '/mensajes'`);
    if (!existingSubMsg.length) {
      await pool.query(`
        INSERT INTO sys_submenus (menu_id, nombre, descripcion, icono, ruta, orden, estado)
        VALUES (?, 'Mensajes de Avisos', 'Configuración de avisos de la plataforma', 'chat', '/mensajes', 1, 1)
      `, [m3Id]);
    }

    console.log("✅ Estructura de menús y submenús configurada exitosamente.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en configuración de base de datos:", err);
    process.exit(1);
  }
}

setup();
