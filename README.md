# Catequesis de adultos

Aplicación React y Node.js para gestionar grupos, catecúmenos, catequistas, fotos y documentos. Preparación de despliegue: 6 de septiembre de 2026.

## Arrancar en este ordenador

Node.js 24 o posterior. Si ya está compilada y la base existe:

```sh
npm start
```

Abrir http://localhost:3000. Conserva los usuarios y datos actuales. Para compilar y verificar:

```sh
npm ci
npm run check
```

`npm run dev` sirve la interfaz de desarrollo y conecta con el backend del puerto 3000. Para una instalación de ejemplo aislada, usar `npm run local`; nunca usar ese modo en AWS.

## Perfiles

- Visualizador: todos los grupos, fichas, fotos y documentos, solo lectura. Es exclusivo.
- Catequista: consulta y completa las fichas de sus grupos; sube fotos y documentos.
- Admin: gestión completa de usuarios, grupos, asignaciones, fichas y archivos.
- Catequista y Admin: una única cuenta y ficha, visible en ambos bloques de Usuarios. Las asignaciones indican qué grupos acompaña; mantiene administración global.

Personas se abren en ventanas con cierre y navegación anterior/siguiente. Las tarjetas de grupo abren sus integrantes. La ficha de catequista incluye nombre, teléfono, correo y foto. Fotos JPG/PNG de hasta 2 MB; documentos PDF/JPG/PNG de hasta 5 MB.

## Datos y operación

La aplicación web usa SQLite; por defecto `local-data/catequesis.sqlite`. Fotos y documentos se guardan dentro de la base. El directorio queda fuera del paquete de despliegue y de Git.

- `npm run db:init`: base vacía y administrador privado mediante variables de entorno.
- `npm run db:backup -- /ruta/copia-nueva.sqlite`: copia consistente verificada.
- `npm run db:reset-password -- USUARIO`: recuperación por operador del servidor; requiere `CATEQUESIS_NEW_PASSWORD`.
- `npm run check`: lint, compilación y pruebas.

La inicialización usa `CATEQUESIS_DB_PATH`, `CATEQUESIS_ADMIN_USERNAME`, `CATEQUESIS_ADMIN_NAME` y `CATEQUESIS_ADMIN_PASSWORD`. No cambia usuarios de bases ya inicializadas.

## Preparación AWS

Seguir [docs/AWS.md](docs/AWS.md). Incluye configuración de HTTPS, servicio Linux, copias, restauración y comprobaciones previas a abrir el acceso. Las plantillas están en `deploy/`.

La primera instalación prevista usa una instancia única con almacenamiento persistente. No se ha desplegado en AWS. Cuenta/región, dominio, certificado y almacenamiento externo de copias se configuran al desplegar.

El estado actual está en [docs/ESTADO.md](docs/ESTADO.md). Funciones de evolución que no forman parte de esta entrega: promociones automáticas, borrado definitivo, conservación documental configurable y recuperación por correo.
