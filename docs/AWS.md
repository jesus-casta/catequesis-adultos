# Despliegue AWS · primera instalación

Preparado el 6 de septiembre de 2026. No se ha creado ningún recurso AWS ni publicado la aplicación.

## Arquitectura prevista

Una instancia Linux de Lightsail o EC2, Node.js 24 LTS, Nginx con HTTPS y un único proceso Node. SQLite y los archivos se guardan en `/var/lib/catequesis/catequesis.sqlite`, fuera del código de `/opt/catequesis`. Los módulos MySQL del repositorio son un trabajo independiente; la aplicación web utiliza SQLite. No activar múltiples réplicas ni ubicar esta base en un sistema de archivos compartido.

El siguiente día elegiremos cuenta/región AWS, dominio, instancia y destino externo de copias. El paquete no incluye la base local, contraseñas, sesiones ni fotos del ordenador. La primera instalación parte de una base vacía y un administrador nuevo. Si se quieren trasladar fichas actuales, habrá que revisar y preparar esa migración expresamente; no copiar la base local de ejemplo directamente a producción.

## Instalación en el servidor

1. Preparar Linux con Node.js 24 LTS (`node:sqlite` incluido), npm, Nginx y un certificado TLS válido para el dominio. Verificar que Node está en `/usr/bin/node` o ajustar los servicios.
2. Crear el usuario de sistema `catequesis`. Descomprimir el paquete en `/opt/catequesis`, conservando el código como propiedad de root y legible por el usuario de servicio. Crear `/var/lib/catequesis` con propietario `catequesis` y modo 0700.
3. El paquete incluye `dist/client`. Instala las dependencias del backend con `npm ci --omit=dev` (incluyen el SDK de Amazon SES). Para recompilar: `npm ci && npm run check` en una máquina de desarrollo o CI.
4. Copiar `deploy/production.env.example` a `/etc/catequesis.env`, sustituir el dominio y dejar el fichero propiedad de root con permisos 0600. No introducir contraseñas en el repositorio.
5. Inicializar la base una sola vez como usuario de servicio. Definir `CATEQUESIS_DB_PATH=/var/lib/catequesis/catequesis.sqlite`, `CATEQUESIS_ADMIN_USERNAME`, `CATEQUESIS_ADMIN_NAME` y `CATEQUESIS_ADMIN_PASSWORD` en un entorno temporal privado; ejecutar `node /opt/catequesis/backend/scripts/init.js`. Contraseña privada de 12 a 128 caracteres. Retirar la variable de contraseña al terminar. La inicialización posterior no restablece cuentas existentes.
6. Instalar `deploy/catequesis.service` en `/etc/systemd/system/`; ejecutar `systemctl daemon-reload` y `systemctl enable --now catequesis`. Verificar `systemctl status catequesis` y `journalctl -u catequesis`.
7. Adaptar `deploy/nginx.conf` al dominio y a las rutas del certificado. Comprobar `nginx -t` antes de recargar. El proxy debe enviar el Host exacto configurado en `CATEQUESIS_PUBLIC_ORIGIN`; la aplicación no confía en un Host reenviado por el cliente.
8. Exponer 443 y 80 (redirigido a HTTPS). Limitar SSH a las IP de administración. Mantener 3000 cerrado en el firewall; Node escucha en 127.0.0.1. Configurar renovación automática del certificado con el mecanismo elegido al instalarlo.
9. Instalar y habilitar `catequesis-backup.service` y `catequesis-backup.timer`. Ejecutar manualmente el servicio de copia y comprobar el resultado antes de activar el timer.

Los puertos y las reglas se detallan en la [documentación de firewall de Lightsail](https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/amazon-lightsail-firewall-rules-reference.html). La plantilla de proxy sigue las directivas [proxy_pass y proxy_set_header de Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

## Comprobación antes de abrir el acceso

- `https://DOMINIO/healthz` devuelve `{"ok":true}`.
- Acceso con el administrador privado; cookies Secure y HttpOnly; salida de sesión correcta.
- Crear catequista, grupo, catecúmeno y visualizador; comprobar permisos con cada cuenta.
- Subir una foto PNG/JPG y un PDF, cerrar sesión y volver a consultarlos.
- Confirmar que las cuentas de ejemplo no existen y que el puerto 3000 no es accesible públicamente.
- Reiniciar el servicio y comprobar que se conservan los datos.
- Descargar una copia a otro almacenamiento y probar la restauración aislada.

El servidor rechaza en producción una base marcada como demo y las contraseñas públicas de ejemplo. El despliegue real de Nginx/systemd y el certificado deben validarse en Linux: las pruebas locales comprueban el servidor HTTP tras un proxy simulado, no la infraestructura AWS.

## Copias y restauración

`npm run db:backup -- /ruta/nueva/copia.sqlite` crea una copia consistente y ejecuta `PRAGMA integrity_check`. Usa la [API de backup de Node SQLite](https://nodejs.org/api/sqlite.html). La copia incluye fichas, cuentas, fotos y documentos. El timer crea una copia diaria en `/var/lib/catequesis/backups`; no elimina copias automáticamente.

Programar además el traslado de las copias a un destino externo privado y cifrado, por ejemplo S3 mediante un rol IAM del servidor, y fijar retención y monitorización del espacio. El almacenamiento externo aún debe configurarse en AWS. Activar snapshots de instancia/disco como segunda protección; [Lightsail permite snapshots automáticos diarios](https://docs.aws.amazon.com/en_en/lightsail/latest/userguide/amazon-lightsail-configuring-automatic-snapshots.html).

Para restaurar: detener `catequesis`, conservar la base actual con otro nombre, colocar la copia verificada en la ruta configurada con propietario `catequesis` y modo 0600. Antes de reabrir el servicio, vaciar la tabla `sessions` de la base restaurada para invalidar sesiones anteriores. Arrancar y comprobar `/healthz`, acceso y documentos. No sustituir una base mientras el proceso esté en marcha.

## Contraseñas y operación

Administración puede cambiar contraseñas desde Usuarios. Si se pierde el acceso de todos los administradores, un operador del servidor puede establecer `CATEQUESIS_NEW_PASSWORD` en su entorno privado y ejecutar `node backend/scripts/reset-password.js USUARIO`, con `CATEQUESIS_DB_PATH` configurado. Revoca las sesiones de esa cuenta. La recuperación por correo utiliza Amazon SES; consulta [SES.md](SES.md).

El límite de acceso se aplica por dirección de conexión y nombre de usuario: ocho fallos durante cinco minutos. No se usan cabeceras X-Forwarded-For no verificadas. Para una apertura amplia, configurar adicionalmente límites en el proxy y observabilidad según el tráfico real.

## Actualizar o volver atrás

Crear copia verificada antes de actualizar. Detener el servicio, conservar la entrega anterior y extraer la nueva sin tocar `/var/lib/catequesis`. Arrancar y ejecutar la comprobación funcional. Si falla, detener, recuperar el código anterior y, si hubo cambios de esquema incompatibles, restaurar también su copia de base. No bajar de versión con una base incompatible.
