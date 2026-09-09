const pool = require("../database");
const { verifyActiveSession } = require("../middleware/authMiddleware");

module.exports = (app) => {
  // GET /api/menu - Obtener la jerarquía completa de menús, submenús y pestañas con sus permisos granulares (ver, crear, editar, eliminar)
  app.get("/api/menu", verifyActiveSession, async (req, res) => {
    try {
      const rolId = req.query.rol_id ? parseInt(req.query.rol_id) : 1; // Por defecto ADMIN (1)

      // 1. Obtener Menús principales activos (Nivel 1)
      const [menus] = await pool.query(
        `SELECT m.id, m.nombre, m.descripcion, m.icono, m.ruta, m.orden,
                MAX(COALESCE(p.puede_ver, 1)) AS puede_ver,
                MAX(COALESCE(p.puede_crear, 1)) AS puede_crear,
                MAX(COALESCE(p.puede_editar, 1)) AS puede_editar,
                MAX(COALESCE(p.puede_eliminar, 1)) AS puede_eliminar
         FROM sys_menus m
         LEFT JOIN sys_rol_permisos p ON p.menu_id = m.id AND p.rol_id = ? AND p.submenu_id IS NULL AND p.tab_id IS NULL
         WHERE m.estado = 1 AND (p.puede_ver IS NULL OR p.puede_ver = 1)
         GROUP BY m.id, m.nombre, m.descripcion, m.icono, m.ruta, m.orden
         ORDER BY m.orden ASC, m.id ASC`,
        [rolId]
      );

      // 2. Obtener Submenús activos (Nivel 2)
      const [submenus] = await pool.query(
        `SELECT s.id, s.menu_id, s.nombre, s.descripcion, s.icono, s.ruta, s.orden,
                MAX(COALESCE(p.puede_ver, 1)) AS puede_ver,
                MAX(COALESCE(p.puede_crear, 1)) AS puede_crear,
                MAX(COALESCE(p.puede_editar, 1)) AS puede_editar,
                MAX(COALESCE(p.puede_eliminar, 1)) AS puede_eliminar
         FROM sys_submenus s
         LEFT JOIN sys_rol_permisos p ON p.submenu_id = s.id AND p.rol_id = ? AND p.tab_id IS NULL
         WHERE s.estado = 1 AND (p.puede_ver IS NULL OR p.puede_ver = 1)
         GROUP BY s.id, s.menu_id, s.nombre, s.descripcion, s.icono, s.ruta, s.orden
         ORDER BY s.orden ASC, s.id ASC`,
        [rolId]
      );

      // 3. Obtener Pestañas activas (Nivel 3)
      const [tabs] = await pool.query(
        `SELECT t.id, t.submenu_id, t.nombre, t.descripcion, t.icono, t.tab_key, t.ruta, t.orden,
                MAX(COALESCE(p.puede_ver, 1)) AS puede_ver,
                MAX(COALESCE(p.puede_crear, 1)) AS puede_crear,
                MAX(COALESCE(p.puede_editar, 1)) AS puede_editar,
                MAX(COALESCE(p.puede_eliminar, 1)) AS puede_eliminar
         FROM sys_menu_tabs t
         LEFT JOIN sys_rol_permisos p ON p.tab_id = t.id AND p.rol_id = ?
         WHERE t.estado = 1 AND (p.puede_ver IS NULL OR p.puede_ver = 1)
         GROUP BY t.id, t.submenu_id, t.nombre, t.descripcion, t.icono, t.tab_key, t.ruta, t.orden
         ORDER BY t.orden ASC, t.id ASC`,
        [rolId]
      );

      // 4. Construir árbol jerárquico estructurado con permisos integrados
      const menuTree = menus.map((m) => {
        const itemSubmenus = submenus
          .filter((s) => s.menu_id === m.id)
          .map((s) => {
            const itemTabs = tabs
              .filter((t) => t.submenu_id === s.id)
              .map((t) => ({
                ...t,
                permisos: {
                  ver: Boolean(t.puede_ver),
                  crear: Boolean(t.puede_crear),
                  editar: Boolean(t.puede_editar),
                  eliminar: Boolean(t.puede_eliminar)
                }
              }));

            return {
              ...s,
              permisos: {
                ver: Boolean(s.puede_ver),
                crear: Boolean(s.puede_crear),
                editar: Boolean(s.puede_editar),
                eliminar: Boolean(s.puede_eliminar)
              },
              tabs: itemTabs
            };
          });

        return {
          ...m,
          permisos: {
            ver: Boolean(m.puede_ver),
            crear: Boolean(m.puede_crear),
            editar: Boolean(m.puede_editar),
            eliminar: Boolean(m.puede_eliminar)
          },
          submenus: itemSubmenus
        };
      });

      res.json(menuTree);
    } catch (error) {
      console.error("Error al obtener árbol de menú con permisos:", error);
      res.status(500).json({ message: "Error al recuperar la jerarquía de menús" });
    }
  });

  // GET /api/menu/admin - Obtener el árbol completo de administración (incluyendo inactivos)
  app.get("/api/menu/admin", async (req, res) => {
    try {
      const [menus] = await pool.query(`SELECT * FROM sys_menus ORDER BY orden ASC`);
      const [submenus] = await pool.query(`SELECT * FROM sys_submenus ORDER BY orden ASC`);
      const [tabs] = await pool.query(`SELECT * FROM sys_menu_tabs ORDER BY orden ASC`);
      const [permisos] = await pool.query(`SELECT * FROM sys_rol_permisos`);

      res.json({ menus, submenus, tabs, permisos });
    } catch (error) {
      res.status(500).json({ message: "Error al recuperar la lista administrativa de menús" });
    }
  });

  // POST /api/menu/toggle-status - Alternar el estado (1/0) de un menú, submenú o pestaña
  app.post("/api/menu/toggle-status", async (req, res) => {
    try {
      const { tipo, id, estado } = req.body || {};
      if (!tipo || !id || estado === undefined) {
        return res.status(400).json({ message: "Parámetros incompletos (tipo, id, estado)" });
      }

      let tabla = "";
      if (tipo === "menu") tabla = "sys_menus";
      else if (tipo === "submenu") tabla = "sys_submenus";
      else if (tipo === "tab") tabla = "sys_menu_tabs";
      else return res.status(400).json({ message: "Tipo no válido (debe ser menu, submenu o tab)" });

      const nuevoEstado = estado ? 1 : 0;
      await pool.query(`UPDATE ?? SET estado = ?, actualizado_en = NOW() WHERE id = ?`, [tabla, nuevoEstado, id]);

      res.json({ message: `Estado de ${tipo} #${id} actualizado a ${nuevoEstado}` });
    } catch (error) {
      console.error("Error al cambiar estado de menú:", error);
      res.status(500).json({ message: "Error interno al actualizar el estado" });
    }
  });
};
