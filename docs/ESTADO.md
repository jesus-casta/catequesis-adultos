# Avance guardado · 28 de agosto de 2026

El trabajo se ha pausado a petición del usuario para continuar mañana. Este paquete es un punto de recuperación, no una entrega definitiva.

## Hecho

- Primera aplicación local en Node.js, con interfaz web y datos ficticios.
- Usuarios y roles; grupos y asignaciones; fichas, fotos y documentos.
- Guía de uso, decisiones provisionales, arquitectura y cambios.
- Compilación de producción completada; comprobación de tipos de la aplicación superada.
- Última ejecución de las pruebas locales: 26 pruebas superadas.

## Pendiente al retomar

- Ejecutar la comprobación conjunta final de las pruebas locales y del proyecto base.
- Completar `docs/PRUEBAS.md`, referenciado en otros documentos.
- Verificar el paquete descargable en una carpeta limpia.
- Revisar juntos la interfaz y confirmar las decisiones provisionales de permisos.
- Preparar la entrega final y guardarla en la carpeta de Drive del proyecto.

No se ha desplegado la aplicación en AWS ni públicamente. No se han cargado datos personales reales. No se han realizado pruebas manuales en un navegador.

El documento de análisis y diseño de Drive no ha sido modificado durante esta implementación.

## Arranque del avance

Con Node.js 24 o posterior, desde la carpeta descomprimida:

```sh
node local/server.mjs --demo
```

Abrir `http://localhost:3000`. Las cuentas de demostración y sus limitaciones están en `README.md`.
