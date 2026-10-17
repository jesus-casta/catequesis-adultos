# Catequesis de adultos

Aplicación React y Node.js para gestionar comunidades, catecúmenos, catequistas, fotos y documentos. Preparación de despliegue: 6 de septiembre de 2026.

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

## Organización y permisos

La jerarquía es **Comunidad → Grupos → Catecúmenos**. Las comunidades tienen nombre y tipo de catequesis, sin campo parroquia. Cada grupo incluye su parroquia, horario, itinerario y nombre del catequista; ese nombre no está vinculado a una cuenta.

- Administrador: gestiona todos los grupos, comunidades, fichas y usuarios.
- Encargado: gestiona únicamente los grupos asignados, sus fichas, documentos y calendario. Puede crear catecúmenos y trasladarlos entre sus grupos; no administra cuentas.
- Visualizador: consulta las comunidades asignadas, incluidos sus grupos futuros, sin editar.

La actualización desactiva una única vez las cuentas antiguas de catequistas y cierra sus sesiones, conservando sus nombres en los grupos. Los administradores y visualizadores conservan sus accesos. Administración crea los nuevos encargados y asigna sus grupos. Por compatibilidad con SQLite, el rol interno `catechist` representa al encargado; la API lo expone como `manager`.

Las fichas se consultan y editan en una vista continua, sin pestañas. En niños aparecen madre, padre y un primer tutor vacío cuando no hay tutores. Los contactos existentes se conservan. Los adultos tienen parroquia en lugar de colegio. Fotos JPG/PNG de hasta 2 MB; documentos PDF/JPG/PNG de hasta 5 MB.

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

La recuperación por correo está deshabilitada. El usuario debe contactar con el administrador general, que cambia la contraseña en **Usuarios → Editar → Nueva contraseña**. El cambio cierra las sesiones anteriores. También se conserva el comando `npm run db:reset-password -- USUARIO` para el operador del servidor.

### Grupos y altas

El listado de grupos se despliega o repliega. Administración puede reordenar grupos. Administradores y encargados pueden trasladar catecúmenos entre los grupos que gestionan. Cada grupo tiene **Nuevo catecúmeno**, con el grupo preseleccionado; administración también dispone de **Nuevo encargado**, con ese grupo marcado.

### Cambios masivos de curso

En Grupos o Personas, **Cambiar cursos en bloque** permite filtrar por grupo, seleccionar niños y asignar 1.º, 2.º, 3.º o dejar el curso sin indicar. Solo modifica el curso; conserva datos, archivos y grupo. La operación comprueba permisos y versiones y se guarda completa o no se guarda ninguna ficha.

### Calendario

Administradores y encargados programan sesiones y celebraciones de sus grupos, individuales o semanales. Los visualizadores consultan las de sus comunidades. No se permiten solapamientos en un mismo grupo.

### Excel

La descarga contiene un listado por grupos con contactos de madre y padre, nacimiento, dirección y colegio para niños o parroquia para adultos. La importación admite el formato anterior con hojas Personas y Tutores.

### Despliegue

Antes de actualizar, crear una copia consistente de SQLite con `backend/scripts/backup.js`. La migración de accesos se ejecuta una sola vez; reiniciar no desactiva encargados creados después. Conservar la imagen anterior y la copia para poder restaurar ambas si fuera necesario.
