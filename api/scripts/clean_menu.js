const pool = require("../database");

async function cleanMenu() {
  console.log("🧹 Limpiando menús obsoletos y duplicados en sys_menus, sys_submenus y sys_rol_permisos...");

  try {
    // 1. Eliminar menús obsoletos (Inspecciones [3], Flotas & Vehículos [4], Planes QI nivel superior [2])
    await pool.query(`DELETE FROM sys_menus WHERE id IN (2, 3, 4)`);
    console.log("✅ Eliminados menús obsoletos (Inspecciones, Flotas & Vehículos, Planes QI duplicado).");

    // 2. Asegurar que los menús restantes tengan el orden correcto
    await pool.query(`UPDATE sys_menus SET orden = 1 WHERE id = 1`); // Dashboard
    await pool.query(`UPDATE sys_menus SET orden = 2 WHERE id = 6`); // Gestión Comercial
    await pool.query(`UPDATE sys_menus SET orden = 3 WHERE id = 7`); // Talento Humano
    await pool.query(`UPDATE sys_menus SET orden = 4 WHERE id = 8`); // Plataforma & Comunicaciones
    await pool.query(`UPDATE sys_menus SET orden = 5 WHERE id = 5`); // Configuración

    // 3. Limpiar duplicados en sys_rol_permisos dejando sólo un registro único por (rol_id, menu_id, submenu_id, tab_id)
    await pool.query(`
      DELETE p1 FROM sys_rol_permisos p1
      INNER JOIN sys_rol_permisos p2 
      WHERE p1.id > p2.id 
        AND p1.rol_id = p2.rol_id 
        AND p1.menu_id <=> p2.menu_id 
        AND p1.submenu_id <=> p2.submenu_id 
        AND p1.tab_id <=> p2.tab_id;
    `);
    console.log("✅ Duplicados en sys_rol_permisos eliminados.");

    // 4. Regenerar permisos base para el rol ADMIN (rol_id = 1) en todos los menús activos
    const [activeMenus] = await pool.query(`SELECT id FROM sys_menus WHERE estado = 1`);
    for (const m of activeMenus) {
      const [existing] = await pool.query(`SELECT id FROM sys_rol_permisos WHERE rol_id = 1 AND menu_id = ? AND submenu_id IS NULL AND tab_id IS NULL`, [m.id]);
      if (!existing.length) {
        await pool.query(`
          INSERT INTO sys_rol_permisos (rol_id, menu_id, puede_ver, puede_crear, puede_editar, puede_eliminar, creado_por)
          VALUES (1, ?, 1, 1, 1, 1, 'sistema')
        `, [m.id]);
      }
    }

    const [activeSubmenus] = await pool.query(`SELECT id, menu_id FROM sys_submenus WHERE estado = 1`);
    for (const s of activeSubmenus) {
      const [existing] = await pool.query(`SELECT id FROM sys_rol_permisos WHERE rol_id = 1 AND menu_id = ? AND submenu_id = ? AND tab_id IS NULL`, [s.menu_id, s.id]);
      if (!existing.length) {
        await pool.query(`
          INSERT INTO sys_rol_permisos (rol_id, menu_id, submenu_id, puede_ver, puede_crear, puede_editar, puede_eliminar, creado_por)
          VALUES (1, ?, ?, 1, 1, 1, 1, 'sistema')
        `, [s.menu_id, s.id]);
      }
    }

    console.log("🎉 Estructura de menú limpia y desduplicada con éxito.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al limpiar menús:", err);
    process.exit(1);
  }
}

cleanMenu();
