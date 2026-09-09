# Manual e Instructivo de Instalación, Diagnóstico de Logs y Pruebas

Este documento detalla el diagnóstico del fallo de inicio de sesión en dispositivos nativos, la solución implementada para la configuración dinámica de servidores API, y las instrucciones de uso para **Android (`.apk`)** y **Windows (`.exe`)**.

---

## 1. Explicación de la Causa del Error y Solución Aplicada

### ¿Por qué ocurrió el error *"El servidor API no devolvió una respuesta válida (200)"*?
- **Causa**: Al instalar el APK en Android o ejecutar el `.exe` en Windows, la aplicación corre localmente dentro del dispositivo (`capacitor://localhost` o `file://`). La configuración anterior usaba la ruta relativa `/api/auth/login`. Al no estar servida desde el dominio web Nginx, la llamada local apuntaba a un asset inexistente en el dispositivo, devolviendo el HTML predeterminado en lugar del JSON de la API.
- **Solución Implementada**:
  1. **Detección Automática de Entorno**: Si la app detecta que corre en Android o Windows, apunta por defecto al servidor API completo (`https://planesqi.org/api` o el dominio/IP donde se encuentra el backend).
  2. **Panel de Configuración de Servidor API**: Se agregó un botón interactivo **"⚙️ Configurar Servidor & Diagnóstico (Logs)"** en la pantalla de Login y Layout principal.
  3. **Prueba de Conexión y Latencia**: Permite ingresar la IP o URL del servidor de pruebas (ej: `http://192.168.1.50:3060/api` o `https://mi-dominio.com/api`) y probar la salud de la API con el botón **"Probar Conexión"**.
  4. **Visor de Logs de Diagnóstico**: Registra todas las llamadas HTTP, respuestas, códigos de estado (200, 401, 404, 500) y errores de red en tiempo real directamente en la pantalla de la app, permitiendo **copiar los logs al portapapeles** con un clic.
  5. **Herramientas de Desarrollo en Windows (F12)**: Se habilitaron los atajos `F12` y `Ctrl+Shift+I` en el ejecutable de Windows para abrir Chrome DevTools y revisar la consola y red.

---

## 2. Instrucciones de Uso y Diagnóstico en Android (.apk)

1. **Instalación**:
   - Descargue e instale el archivo [app-debug.apk](file:///home/oscars_it/Documentos/oscar/gestionplanesqi/deploy-out/app-debug.apk).
2. **Si el inicio de sesión falla**:
   - En la pantalla de inicio de sesión, presione el botón **"Configurar Servidor & Diagnóstico (Logs)"**.
   - **Pestaña "Servidor API"**:
     - Verifique o ingrese la URL o IP de su servidor backend (ejemplo: `https://planesqi.org/api` o `http://192.168.X.X:3060/api`).
     - Presione **"Probar Conexión"**. Si es exitosa, presione **"Guardar Servidor"**.
   - **Pestaña "Logs de Diagnóstico"**:
     - Revise las peticiones enviadas y las respuestas recibidas.
     - Presione **"Copiar"** para copiar el informe completo de errores al portapapeles y enviarlo al desarrollador si requiere soporte.

---

## 3. Instrucciones de Uso y Diagnóstico en Windows (.exe)

1. **Ejecución**:
   - Extraiga [Quasar-App-Windows-x64.zip](file:///home/oscars_it/Documentos/oscar/gestionplanesqi/deploy-out/Quasar-App-Windows-x64.zip) y ejecute `Quasar App.exe`.
2. **Cómo validar los logs en Windows**:
   - **Opción A (Visor Integrado)**: Haga clic en **"Configurar Servidor & Diagnóstico (Logs)"** para ver el panel de logs, probar la API o modificar el endpoint.
   - **Opción B (Chrome DevTools de Windows)**: Presione la tecla **`F12`** o la combinación **`Ctrl + Shift + I`**. Se abrirá la ventana oficial de Developer Tools de Chrome dentro de la aplicación donde podrá ver la pestaña *Console* y *Network*.

---

## 4. Resumen de Archivos en `deploy-out/`

| Archivo | Tamaño | Descripción |
| :--- | :--- | :--- |
| **[Quasar-App-Windows-x64.zip](file:///home/oscars_it/Documentos/oscar/gestionplanesqi/deploy-out/Quasar-App-Windows-x64.zip)** | ~153 MB | Ejecutable listo para Windows con soporte F12 DevTools y selector de API. |
| **[app-debug.apk](file:///home/oscars_it/Documentos/oscar/gestionplanesqi/deploy-out/app-debug.apk)** | ~4.9 MB | APK de Android actualizado con selector de API y visor de logs de diagnóstico. |
| **[INSTRUCTIVO_INSTALACION_Y_PRUEBAS.md](file:///home/oscars_it/Documentos/oscar/gestionplanesqi/deploy-out/INSTRUCTIVO_INSTALACION_Y_PRUEBAS.md)** | ~5 KB | Manual de usuario e instructivo de diagnóstico. |
