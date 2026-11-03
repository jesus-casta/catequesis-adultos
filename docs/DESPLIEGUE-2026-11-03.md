# Actualización de la ficha de adultos del 3 de noviembre de 2026

Publicada en https://gestioncatequesis.es. La ficha muestra el itinerario del grupo, adapta los campos a la respuesta sobre bautismo y permite abrir la inscripción para imprimir o guardar como PDF. Los campos ocultos se conservan; la actualización no deduce el bautismo ni rellena información desconocida.

Se actualizaron la interfaz compilada y `backend/services/validation.js`. Se comprobó que `backend/app.js`, `backend/models/store.js` y `package-lock.json` coincidían con producción antes de reutilizar la imagen y sus dependencias.

## Instalación activa

- Instancia EC2: `i-051ff857db01810b9`, región `eu-south-2`.
- Contenedor: `catequesis-adultos`; proyecto Compose: `catequesis-adultos`.
- Nueva imagen: `catequesis-adultos-adultos:adult-registration-20261103`.
- ID de imagen: `sha256:9e1e4c4d4a12a151b0a01b9062360e4bc037739205beaeb3329ac5207e842b9b`.
- Entrega: `/home/ubuntu/releases/adult-registration-20261103`.
- Base Compose conservada: `/home/ubuntu/releases/group-buttons-20261014/compose.yaml`.
- Configuración adicional activa: `/home/ubuntu/releases/adult-registration-20261103/compose.release.json`.
- Datos persistentes: `/var/lib/catequesis/catequesis.sqlite`.

La configuración adicional conserva el entorno del contenedor anterior. Tiene permisos 0600 y permanece exclusivamente en el servidor. No copiar su contenido al repositorio.

## Verificación

Pasaron lint, compilación y 85 pruebas locales (17 de interfaz y 68 de servidor). Tras el despliegue, `/healthz` respondió correctamente por HTTPS. El JavaScript servido coincide por SHA-256 con el archivo local compilado (`index-CMl-U1mb.js`).

Se compararon los contenidos completos de las tablas `people`, `groups`, `users` y `files` con la copia previa mediante hashes calculados en el servidor: todos se conservaron. Recuentos antes y después: 182 personas, 19 grupos, 8 usuarios y 2 archivos. No se modificaron registros personales.

La impresión queda pendiente de revisión visual desde una sesión autenticada de navegador.

## Copia y vuelta a la versión anterior

Copia consistente verificada antes de actualizar: `/var/lib/catequesis/backups/before-adult-registration-20261103.sqlite`. Incluye cuentas, fichas y archivos. Se conserva la imagen anterior `catequesis-adultos-adultos:group-buttons-20261014` (ID `sha256:83ccae8a39ccf4b750fd7bbb02761296d7545c43b8ecd1fbf08273cad185954a`).

Para volver al código anterior en el servidor, manteniendo la base actual:

```sh
sudo docker compose -p catequesis-adultos \
  -f /home/ubuntu/releases/group-buttons-20261014/compose.yaml \
  -f /home/ubuntu/releases/adult-registration-20261103/compose.rollback.json \
  up -d --no-build adultos
curl --fail https://gestioncatequesis.es/healthz
```

Esta actualización no requiere restaurar la base para volver al código anterior. Restaurar la copia descartaría las modificaciones realizadas después de su creación.
