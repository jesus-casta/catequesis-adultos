# Estado comprobado · 30 de agosto de 2026

Primera versión local preparada para revisión, todavía no apta para datos reales ni para producción.

## Hecho

- Primera aplicación local en Node.js, con interfaz web y datos ficticios.
- Usuarios y roles; grupos y asignaciones; fichas, fotos y documentos.
- Guía de uso, decisiones provisionales, arquitectura y cambios.
- Interfaz migrada de TypeScript/Vinext a React con JavaScript/JSX y Vite.
- Proyecto reorganizado en `frontend` y `backend`, con modelo SQLite y servicios separados.
- Instalación reproducible con `npm ci` y compilación de producción completadas con Node.js 26.7.0.
- Última ejecución: 26 de 26 pruebas funcionales y 4 de 4 pruebas del frontend superadas.
- Las tareas futuras se han centralizado en `TODO.txt` y retirado de la interfaz.
- Resultados, incidencias del entorno y revisión manual pendiente documentados en `docs/PRUEBAS.md`.

## Pendiente al retomar

- Verificar el paquete descargable en una carpeta limpia.
- Revisar juntos la interfaz y confirmar las decisiones provisionales de permisos.
- Preparar la entrega final y guardarla en la carpeta de Drive del proyecto.
- Analizar las 21 alertas de dependencias comunicadas por `npm ci` antes de decidir actualizaciones.

No se ha desplegado la aplicación en AWS ni públicamente. No se han cargado datos personales reales. La revisión funcional manual completa sigue pendiente.

El documento de análisis y diseño de Drive no ha sido modificado durante esta implementación.

## Arranque del avance

Con Node.js 24 o posterior, desde la carpeta descomprimida:

```sh
node backend/app.js --demo
```

Abrir `http://localhost:3000`. Las cuentas de demostración y sus limitaciones están en `README.md`.
