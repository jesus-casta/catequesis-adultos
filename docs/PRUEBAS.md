# Comprobaciones de la versión local 0.1.0

Última ejecución: 29 de agosto de 2026, con Node.js 26.7.0 y npm 11.19.0 en macOS.

## Resultado automatizado

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Correcto: 674 paquetes instalados desde `package-lock.json`. npm informó de 21 vulnerabilidades de dependencias (1 baja, 4 moderadas y 16 altas), pendientes de análisis antes de actualizar paquetes. |
| `npm run typecheck` | Correcto, sin errores de TypeScript. |
| `npm run build` | Correcto: Vinext compiló los cinco entornos y prerenderizó dos rutas. |
| `npm run test:local` | Correcto: 26 de 26 pruebas superadas. |
| `node --test tests/*.test.mjs` | Correcto: 5 de 5 pruebas superadas. |

Las 26 pruebas locales cubren autenticación y sesiones, limitación de intentos, CSRF y origen, permisos por perfil y grupo, administración de usuarios y grupos, traslado y alta mínima de personas, control de versiones, fotos, documentos, duplicados, transacciones, persistencia, validaciones y servicio de la interfaz compilada. Las cinco pruebas del proyecto base comprueban metadatos renderizados y componentes/utilidades de interfaz.

## Incidencias del entorno

- La primera compilación no pudo ejecutarse porque macOS no proporciona GNU `timeout`. El script acepta ahora `timeout` o `gtimeout` cuando existen y, si no están disponibles, ejecuta Vinext sin límite temporal.
- El entorno aislado bloqueó inicialmente los puertos loopback usados por el prerenderizado y por los servidores efímeros de pruebas. La compilación y las pruebas se repitieron con permiso local de red y terminaron correctamente.
- Vinext mostró un aviso deprecado de Node.js sobre `module.register()`; no impidió compilar ni probar.

## Limitaciones de estas pruebas

- No constituyen una auditoría de seguridad, privacidad, accesibilidad ni cumplimiento jurídico.
- La validación de archivos comprueba tamaño, extensión y firmas básicas, pero no malware ni autenticidad documental.
- No se han probado despliegues, acceso desde otros equipos, AWS, restauración operativa de copias ni grandes volúmenes de datos.
- La ejecución automatizada usa exclusivamente datos ficticios y bases temporales.

## Revisión manual pendiente

- Recorrer en navegador los cuatro perfiles y confirmar la claridad de navegación, formularios, mensajes y adaptación a distintos tamaños de pantalla.
- Probar con archivos ficticios la vista previa de foto, la apertura de PDF/PNG/JPG y el comportamiento de descarga del navegador.
- Comprobar manualmente persistencia tras reiniciar, sesiones en ventanas separadas y conflicto de edición simultánea.
- Revisar accesibilidad con teclado, lector de pantalla, contraste y ampliación.
- Confirmar las decisiones funcionales provisionales enumeradas en `docs/DECISIONES.md`, especialmente D05 a D16.
- Analizar las 21 alertas de `npm audit` antes de cualquier actualización de dependencias; no se aplicó `npm audit fix` para evitar cambios de alcance o incompatibilidades.
