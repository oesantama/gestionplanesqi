# gestionplanesqi

Gestión de Planes QI — SPA (Vue 3 + Quasar 2) con builds para web, Android/iOS
(Capacitor) y Windows (Electron), y su API (Express + mysql2) conectada a la
base de datos `qinspect_planesQi`.

## Clonar y continuar en otro editor/computador

```
git clone git@github.com:oesantama/gestionplanesqi.git
cd gestionplanesqi
```

Luego abre la carpeta `gestionplanesqi` con el editor que prefieras:

- **VS Code**: `code gestionplanesqi` (o "Archivo → Abrir carpeta").
- **WebStorm / IntelliJ**: "Open" y selecciona la carpeta `gestionplanesqi` (no `frontend/` ni `api/` por separado, para ver ambos proyectos en el mismo workspace).
- Cualquier otro editor: solo necesita Node.js instalado (18+) -- no hay nada específico de un editor en particular.

Cada subproyecto (`frontend/` y `api/`) tiene su propio `package.json` y su propio
`.env`/`.env.example` -- son independientes, cada uno con su `npm install` y
`.env` propio (ver más abajo). Ninguno de los dos `.env` reales se sube al
repo (ver `.gitignore`); si es la primera vez que alguien clona el proyecto,
debe crear su propio `api/.env` a partir de `api/.env.example` con las
credenciales reales de la base de datos.

## Estructura

```
frontend/   SPA en Quasar (web, APK/IPA vía Capacitor, .exe vía Electron)
api/        API REST (Express + mysql2) sobre qinspect_planesQi
```

## Backend (api/)

```
cd api
cp .env.example .env   # completar DB_HOST/DB_USER/DB_PASSWORD
npm install
npm run dev             # nodemon
```

Expone un CRUD genérico y seguro sobre las tablas reales de la base
(`Empleados`, `Empresas`, `mensajes`, `planes`, `Planes_empresas`) --
la llave primaria de cada tabla se detecta en la propia base de datos
(`SHOW KEYS ... WHERE Key_name = 'PRIMARY'`), no se asume que sea "id":

- `GET /tables` — tablas disponibles
- `GET /tables/:table/columns` — columnas reales + llave primaria
- `GET /tables/:table?page=&limit=&search=` — listado paginado, con búsqueda
- `POST /tables/:table` — crear
- `PUT /tables/:table/:pk` — actualizar (por la llave primaria real)
- `DELETE /tables/:table/:pk` — borrar

## Frontend (frontend/)

```
cd frontend
npm install
npm run dev              # servidor de desarrollo (SPA)
npm run build             # build de producción (SPA)
npx quasar dev -m electron   # Windows/desktop en desarrollo
npx quasar build -m electron # empaquetar .exe
npx quasar dev -m capacitor -T android   # Android en desarrollo (requiere Android Studio)
npx quasar dev -m capacitor -T ios       # iOS en desarrollo (requiere Xcode, solo en macOS)
```
