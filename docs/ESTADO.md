# Estado comprobado · 29 de agosto de 2026

Primera versión local preparada para revisión, todavía no apta para datos reales ni para producción.

## Hecho

- Primera aplicación local en Node.js, con interfaz web y datos ficticios.
- Usuarios y roles; grupos y asignaciones; fichas, fotos y documentos.
- Guía de uso, decisiones provisionales, arquitectura y cambios.
- Instalación reproducible con `npm ci`, comprobación de tipos y compilación de producción completadas con Node.js 26.7.0.
- Última ejecución: 26 de 26 pruebas locales y 5 de 5 pruebas del proyecto base superadas.
- Script de compilación compatible con macOS sin GNU `timeout`; conserva el límite cuando existe `timeout` o `gtimeout`.
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
node local/server.mjs --demo
```

Abrir `http://localhost:3000`. Las cuentas de demostración y sus limitaciones están en `README.md`.
