# Estado de entrega · 6 de septiembre de 2026

## Completado y comprobado localmente

- Interfaz renovada; usuarios en Visualizadores, Catequistas y Administradores.
- Combinación Catequista y Admin con una cuenta y ficha; Visualizador exclusivo.
- Administración con ficha completa, catequista limitado a sus grupos y visualizador global de solo lectura.
- Fichas flotantes, navegación por listado filtrado, tarjetas de grupos y fichas de catequista.
- Datos personales, sacramentos, familia, padrinos, contacto, fotos y documentación.
- Alta y edición, permisos en servidor, CSRF, sesiones, control de versiones y adjuntos.
- Base de producción vacía, administrador privado, HTTPS tras proxy, cookies Secure, Host/Origin comprobados y endpoint de salud.
- Copias SQLite consistentes, verificación de integridad y recuperación de contraseña por operador.
- Configuración lint reparada; dependencias actualizadas con auditoría npm sin vulnerabilidades conocidas en la ejecución del 6 de septiembre.
- 42 pruebas: 4 frontend/compilación y 38 backend, incluyendo producción y recuperación de copia.

## Preparado para la próxima sesión

Guía `docs/AWS.md` y plantillas de Nginx, systemd, variables y timer de copias. El paquete de entrega excluye bases locales, credenciales y archivos privados. La cuenta local de Jesús conserva sus permisos.

## A comprobar en AWS

Instancia/dominio, instalación Linux, certificado y renovación, copia externa, restauración operativa y recorrido manual final con cada perfil. La infraestructura todavía no se ha desplegado. No se ha ejecutado una auditoría de seguridad externa. La validación de formato de adjuntos es básica, no un análisis antivirus.

## Evolución posterior

Promociones de curso, bajas/borrado y conservación, historial de padrinos y documentos, documentos obligatorios y recuperación automática por correo. No se han inventado reglas para esos procesos. Los módulos MySQL/importación son independientes; no constituyen el almacenamiento de la aplicación web actual.

Los demás documentos con fecha de agosto describen entregas históricas; este archivo, README y AWS.md reflejan el estado actual.

No había navegador disponible en el entorno de revisión final; la comprobación visual final queda para el recorrido de despliegue. Los recorridos funcionales previos fueron revisados con el usuario durante el desarrollo.
