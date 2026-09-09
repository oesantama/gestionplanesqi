-- ============================================================
-- SCRIPT DE BASE DE DATOS TOTALMENTE NORMALIZADA (3NF)
-- SISTEMA DE GESTIÓN DE PLANES QI & SEGURIDAD ISO 27001 / BASC
-- ============================================================

-- 1. TABLA MAESTRA DE ROLES
CREATE TABLE IF NOT EXISTS sys_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA MAESTRA DE USUARIOS (Relacionada con sys_roles por rol_id)
CREATE TABLE IF NOT EXISTS sys_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  rol_id INT NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  session_id VARCHAR(100) NULL COMMENT 'UUID de sesión única activa entre dispositivos BASC/ISO',
  estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo, 2: Bloqueado',
  intentos_fallidos INT DEFAULT 0 COMMENT 'Protección anti fuerza bruta ISO 27001',
  bloqueado_hasta DATETIME NULL,
  ultimo_login DATETIME NULL,
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES sys_roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA DE MENÚS PRINCIPALES (Nivel 1)
CREATE TABLE IF NOT EXISTS sys_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  icono VARCHAR(50),
  ruta VARCHAR(150),
  nivel INT NOT NULL DEFAULT 1,
  orden INT NOT NULL DEFAULT 0,
  estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE SUBMENÚS (Nivel 2 - Relacionada por menu_id)
CREATE TABLE IF NOT EXISTS sys_submenus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  icono VARCHAR(50),
  ruta VARCHAR(150),
  nivel INT NOT NULL DEFAULT 2,
  orden INT NOT NULL DEFAULT 0,
  estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_submenu_menu FOREIGN KEY (menu_id) REFERENCES sys_menus(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA DE PESTAÑAS / TABS (Nivel 3 - Relacionada por submenu_id)
CREATE TABLE IF NOT EXISTS sys_menu_tabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submenu_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  icono VARCHAR(50),
  tab_key VARCHAR(50) NOT NULL,
  ruta VARCHAR(150),
  nivel INT NOT NULL DEFAULT 3,
  orden INT NOT NULL DEFAULT 0,
  estado TINYINT NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tab_submenu FOREIGN KEY (submenu_id) REFERENCES sys_submenus(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA DE PERMISOS DE ROL SOBRE MENÚS, SUBMENÚS Y TABS
CREATE TABLE IF NOT EXISTS sys_rol_permisos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rol_id INT NOT NULL,
  menu_id INT NULL,
  submenu_id INT NULL,
  tab_id INT NULL,
  puede_ver TINYINT NOT NULL DEFAULT 1,
  puede_crear TINYINT NOT NULL DEFAULT 0,
  puede_editar TINYINT NOT NULL DEFAULT 0,
  puede_eliminar TINYINT NOT NULL DEFAULT 0,
  creado_por VARCHAR(100) DEFAULT 'sistema',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_permiso_rol FOREIGN KEY (rol_id) REFERENCES sys_roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_permiso_menu FOREIGN KEY (menu_id) REFERENCES sys_menus(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_permiso_submenu FOREIGN KEY (submenu_id) REFERENCES sys_submenus(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_permiso_tab FOREIGN KEY (tab_id) REFERENCES sys_menu_tabs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA DE BITÁCORA Y AUDITORÍA DE SEGURIDAD (ISO 27001 / BASC)
CREATE TABLE IF NOT EXISTS sys_bitacora_seguridad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  username VARCHAR(50),
  evento VARCHAR(100) NOT NULL,
  detalles TEXT,
  ip_origen VARCHAR(45),
  user_agent VARCHAR(255),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (usuario_id) REFERENCES sys_usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS INICIALES DE PRUEBA Y ESTRUCTURA SEMILLA
-- ============================================================

-- Insertar Roles Maestros
INSERT INTO sys_roles (id, codigo, nombre, descripcion, estado) VALUES
(1, 'ADMIN', 'Administrador del Sistema', 'Acceso total y gestión de configuración', 1),
(2, 'SUPERVISOR', 'Supervisor Operativo', 'Control de flotas y aprobación de inspecciones', 1),
(3, 'OPERADOR', 'Operador / Conductor', 'Diligenciamiento de checklist preoperacional', 1),
(4, 'AUDITOR', 'Auditor ISO / BASC', 'Acceso a reportes y bitácoras de auditoría', 1)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Insertar Usuario Admin por defecto (Password Hash para 'Admin123*')
INSERT INTO sys_usuarios (id, uuid, rol_id, nombre_completo, email, username, password_hash, estado) VALUES
(1, 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1, 'Administrador Qinspecting', 'admin@qinspecting.com', 'admin', '$2a$10$h9Wd/HjWbC1mY7L9e7MvRe9y01.M5y.h5B3b.c3u7e8k8f2a1b2c3', 1)
ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo);

-- Insertar Menús Principales (Nivel 1)
INSERT INTO sys_menus (id, nombre, descripcion, icono, ruta, nivel, orden, estado) VALUES
(1, 'Dashboard', 'Resumen operacional de flotas', 'dashboard', '/', 1, 1, 1),
(2, 'Planes QI', 'Gestión de planes de inspección', 'assignment', '/planes', 1, 2, 1),
(3, 'Inspecciones', 'Checklist preoperacionales en vivo', 'fact_check', '/inspecciones', 1, 3, 1),
(4, 'Flotas & Vehículos', 'Registro y estado de la flota', 'directions_car', '/vehiculos', 1, 4, 1),
(5, 'Configuración', 'Parámetros del sistema y seguridad', 'settings', '/configuracion', 1, 5, 1)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Insertar Submenús (Nivel 2)
INSERT INTO sys_submenus (id, menu_id, nombre, descripcion, icono, ruta, nivel, orden, estado) VALUES
(1, 5, 'Gestión de Menús', 'Administración de menús, submenús y pestañas', 'menu_open', '/configuracion/menus', 2, 1, 1),
(2, 5, 'Usuarios y Roles', 'Administración de usuarios y permisos BASC', 'manage_accounts', '/configuracion/usuarios', 2, 2, 1),
(3, 5, 'Bitácora de Auditoría', 'Registro inalterable de auditoría ISO 27001', 'security', '/configuracion/bitacora', 2, 3, 1)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Insertar Tabs / Pestañas (Nivel 3)
INSERT INTO sys_menu_tabs (id, submenu_id, nombre, descripcion, icono, tab_key, ruta, nivel, orden, estado) VALUES
(1, 1, 'Menús Principales', 'Tabla de menús raíz (Nivel 1)', 'list', 'tab_menus', '/configuracion/menus#menus', 3, 1, 1),
(2, 1, 'Submenús', 'Tabla de submenús (Nivel 2)', 'toc', 'tab_submenus', '/configuracion/menus#submenus', 3, 2, 1),
(3, 1, 'Pestañas (Tabs)', 'Tabla de pestañas (Nivel 3)', 'tab', 'tab_tabs', '/configuracion/menus#tabs', 3, 3, 1)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Permisos iniciales para Rol ADMIN (Full Access: ver, crear, editar, eliminar)
INSERT INTO sys_rol_permisos (rol_id, menu_id, submenu_id, tab_id, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
(1, 1, NULL, NULL, 1, 1, 1, 1),
(1, 2, NULL, NULL, 1, 1, 1, 1),
(1, 3, NULL, NULL, 1, 1, 1, 1),
(1, 4, NULL, NULL, 1, 1, 1, 1),
(1, 5, NULL, NULL, 1, 1, 1, 1),
(1, 5, 1, NULL, 1, 1, 1, 1),
(1, 5, 2, NULL, 1, 1, 1, 1),
(1, 5, 3, NULL, 1, 1, 1, 1),
(1, 5, 1, 1, 1, 1, 1, 1),
(1, 5, 1, 2, 1, 1, 1, 1),
(1, 5, 1, 3, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE puede_ver=1;
