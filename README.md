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

## Perfiles

- Visualizador: todas las comunidades, fichas, fotos y documentos, solo lectura. Es exclusivo.
- Catequista: consulta y completa las fichas de sus comunidades; sube fotos y documentos.
- Admin: gestión completa de usuarios, comunidades, asignaciones, fichas y archivos.
- Catequista y Admin: una única cuenta y ficha, visible en ambos bloques de Usuarios. Las asignaciones indican qué comunidades acompaña; mantiene administración global.

Personas se abren en ventanas con cierre y navegación anterior/siguiente. Las tarjetas de comunidad abren sus integrantes. La ficha de catequista incluye nombre, teléfono, correo y foto. Fotos JPG/PNG de hasta 2 MB; documentos PDF/JPG/PNG de hasta 5 MB.

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

### Administradores de comunidad

En **Usuarios → Editar**, selecciona **Administrador de comunidad** y marca los megagrupos en **Administrador de comunidad: megagrupos que podrá editar**. La cuenta se identifica como administrador de comunidad y puede editar esos megagrupos, crear y editar sus comunidades, asignar catequistas y gestionar sus personas y documentos. El permiso incluye las comunidades futuras y se retira inmediatamente al desmarcar el megagrupo. Las asignaciones adicionales como catequista conservan sus permisos habituales.

Solo el administrador general crea megagrupos y gestiona cuentas, contraseñas y permisos. Las bases existentes incorporan la tabla de permisos sin cambiar las asignaciones actuales.

### Catequesis y comunidades

Después de iniciar sesión se elige entre **Catequesis de adultos** y **Primera Comunión — San Francisco de Asís**. Dentro de cada catequesis, administración puede crear las comunidades que necesite y asignar personas y catequistas. El menú «Catequesis» permite volver a elegir. Las listas y búsquedas de personas quedan limitadas a la catequesis seleccionada. Usuarios y permisos siguen siendo globales; las asignaciones identifican la catequesis de cada comunidad.

Al actualizar, todas las comunidades existentes se incorporan automáticamente a adultos, conservando sus identificadores, personas, documentos y permisos. San Francisco comienza sin comunidades. La base de demostración conserva sus tres comunidades de ejemplo; en producción se conservan exactamente las comunidades existentes. No hay que reinicializar la base. Haz una copia de seguridad antes de desplegar y reconstruye el servicio `adultos` de Docker.

Los catequistas solo ven las catequesis que contienen comunidades asignadas a ellos; no obtienen acceso al resto de comunidades de esa catequesis. Administración mantiene su acceso global. Los visualizadores consultan únicamente las catequesis asignadas. La creación y edición de comunidades corresponde a administración. Las comunidades nuevas de San Francisco usan el itinerario Primera Comunión; sus nombres permiten indicar curso, turno o nivel. No se trasladan comunidades completas entre catequesis desde el formulario.

En **Usuarios → Editar → Visualizador**, marca uno o varios «Megagrupos que podrá consultar». La selección incluye las comunidades actuales y futuras de cada catequesis. Sin selección, el visualizador no puede consultar comunidades, fichas, documentos ni fotos de catequistas. Al retirar una catequesis, las siguientes peticiones al servidor pierden el acceso inmediatamente, incluso con una sesión abierta.

La migración conserva una única vez el acceso de los visualizadores existentes a las catequesis actuales. Administración puede restringirlo después. Las cuentas nuevas no reciben permisos por defecto y reiniciar el servidor no restaura permisos retirados.

Administración dispone de **Nuevo megagrupo** y **Editar megagrupo** en la pantalla inicial de catequesis. Permiten definir nombre, parroquia e itinerarios admitidos (todos, adultos o Primera Comunión). Los dos megagrupos iniciales también son editables. Cambiar nombre o parroquia conserva las fichas, comunidades y permisos existentes; la parroquia sirve como propuesta para comunidades nuevas. Se rechaza un cambio de tipo incompatible con las comunidades existentes. Los nuevos megagrupos deben asignarse explícitamente a los visualizadores desde Usuarios.

### Ordenar catecúmenos

En el listado, **Ordenar por** permite elegir **Nombre (A–Z)** o **Curso (nivel y letra)**. El curso se toma del nombre de la comunidad, por ejemplo `1.º A`, `1.º B`, `2.º A`. Si no indica nivel, se usa el del itinerario cuando se conoce; las comunidades sin nivel quedan al final. Dentro de cada comunidad se ordena por nombre y apellidos. La búsqueda, el filtro y las flechas de las fichas respetan el orden elegido.

### Calendario por comunidades

**Mi calendario** muestra un mes y la agenda con el tema, horario y notas de cada sesión. Se puede acceder desde el menú o desde **Comunidades → Ver calendario de esta comunidad**. En una catequesis concreta se muestran sus comunidades; desde la pantalla inicial se pueden consultar todas las comunidades accesibles.

El administrador general y los administradores de comunidad pueden pulsar **Programar actividad**, elegir una comunidad, la primera fecha y **Repetir hasta** para crear sesiones cada siete días (máximo 53 por operación). El horario se propone desde la comunidad. También pueden crear una sesión individual. El tema inicial puede ser «Tema pendiente»; después se edita cada fecha por separado. Las notas son visibles para quienes tienen acceso a esa comunidad.

Los catequistas consultan las sesiones de sus comunidades y los visualizadores las de sus megagrupos asignados. El servidor verifica el ámbito en cada petición. Los cambios de tema, fecha y horario requieren permiso de administración; los festivos se pueden marcar como **Cancelada** y siguen visibles. Los cambios en una fecha no afectan al resto de la serie. No se permiten sesiones programadas que se solapen en una misma comunidad; si una serie encuentra un conflicto, no guarda ninguna de sus fechas.

La actualización crea automáticamente la tabla de calendario sin modificar los registros existentes. Los horarios representan la hora local de la comunidad; la recurrencia semanal conserva el día al cambiar el horario de verano.

El calendario también permite **Celebraciones**. En **Programar actividad**, selecciona el tipo y escribe el nombre de la celebración, fecha, horario y notas. Se distinguen visualmente de las sesiones y pueden ser individuales o semanales. Solo el administrador general y los administradores de comunidad pueden crear, editar o cancelar actividades, siempre dentro de su ámbito; catequistas y visualizadores solo consultan.

En **Ficha → Sacramentos**, el campo opcional **Parroquia de bautismo** permite registrar dónde fue bautizado el niño. Se guarda con los datos sacramentales, separado de la parroquia de su comunidad, y aparece también en la consulta de la ficha. Las fichas existentes lo muestran sin indicar hasta que se complete.
