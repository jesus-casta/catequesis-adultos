# Pruebas · 6 de septiembre de 2026

`npm run check` ejecuta ESLint, compilación y 42 pruebas automáticas. Incluye permisos de los perfiles y su combinación, fotos, documentos, control de versiones, sesiones y CSRF; también la inicialización privada, HTTPS tras proxy simulado, cookies Secure y la copia/restauración SQLite.

Auditoría `npm audit fix`: cero vulnerabilidades conocidas tras actualizar Vite a 8.2.2 y las dependencias transitivas afectadas.

Probado en macOS con Node.js 26.7.0. CI configurado para Node.js 24 en Linux, pendiente de ejecución en GitHub. Nginx y systemd se comprobarán en AWS. No había navegador de automatización disponible para la revisión visual final.
