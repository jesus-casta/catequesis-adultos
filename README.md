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

### Recuperación de contraseña

El login incluye «¿Has olvidado tu contraseña?». El usuario introduce su nombre de acceso y recibe un enlace en el correo de su ficha (Administración → Usuarios). Las cuentas sin correo deben contactar con administración.

El envío utiliza la API HTTPS de Amazon SES desde el backend, sin `sendmail` ni servidor SMTP en Docker. Configura `CATEQUESIS_MAIL_FROM`, `AWS_REGION` y permisos AWS de envío. Sigue [la guía de SES y Docker](docs/SES.md) para completar AWS, actualizar el contenedor y probar la entrega. Sin remitente configurado, el formulario indica que debe contactarse con administración.

Los enlaces caducan en 30 minutos, se guardan únicamente como hash y son de un solo uso. Cambiar la contraseña revoca todas las sesiones y enlaces de recuperación de esa cuenta. También se invalidan si cambia su correo o contraseña. La respuesta de solicitud no revela si existe el usuario y se limita la frecuencia de las solicitudes.

### Catequesis y grupos

Después de iniciar sesión se elige entre **Catequesis de adultos** y **Primera Comunión — San Francisco de Asís**. Dentro de cada catequesis, administración puede crear los grupos que necesite y asignar personas y catequistas. El menú «Catequesis» permite volver a elegir. Las listas y búsquedas de personas quedan limitadas a la catequesis seleccionada. Usuarios y permisos siguen siendo globales; las asignaciones identifican la catequesis de cada grupo.

Al actualizar, todos los grupos existentes se incorporan automáticamente a adultos, conservando sus identificadores, personas, documentos y permisos. San Francisco comienza sin grupos. La base de demostración conserva sus tres grupos de ejemplo; en producción se conservan exactamente los grupos existentes. No hay que reinicializar la base. Haz una copia de seguridad antes de desplegar y reconstruye el servicio `adultos` de Docker.

Los catequistas solo ven las catequesis que contienen grupos asignados a ellos; no obtienen acceso al resto de grupos de esa catequesis. Administración mantiene su acceso global. Los visualizadores consultan únicamente las catequesis asignadas. La creación y edición de grupos corresponde a administración. Los grupos nuevos de San Francisco usan el itinerario Primera Comunión; sus nombres permiten indicar curso, turno o nivel. No se trasladan grupos completos entre catequesis desde el formulario.

En **Usuarios → Editar → Visualizador**, marca uno o varios «Megagrupos que podrá consultar». La selección incluye los grupos actuales y futuros de cada catequesis. Sin selección, el visualizador no puede consultar grupos, fichas, documentos ni fotos de catequistas. Al retirar una catequesis, las siguientes peticiones al servidor pierden el acceso inmediatamente, incluso con una sesión abierta.

La migración conserva una única vez el acceso de los visualizadores existentes a las catequesis actuales. Administración puede restringirlo después. Las cuentas nuevas no reciben permisos por defecto y reiniciar el servidor no restaura permisos retirados.
