# Comprobaciones de la versión local 0.1.0

Última ejecución: 30 de agosto de 2026, con Node.js 26.7.0 y npm 11.19.0 en macOS.

## Resultado automatizado

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Correcto: instalación reproducible del frontend React/Vite. |
| `npm run build` | Correcto: Vite generó HTML, CSS y JavaScript. |
| `npm run test:local` | Correcto: 26 de 26 pruebas superadas. |
| `node --test tests/*.test.mjs` | Correcto: 4 de 4 pruebas superadas. |

Las 26 pruebas funcionales cubren autenticación, permisos, personas, grupos, usuarios, archivos, persistencia y seguridad. Las cuatro pruebas del frontend comprueban el HTML, JSX/Vite y la separación de `TODO.txt`.

## Incidencias del entorno

- El entorno aislado bloqueó inicialmente los puertos loopback usados por el prerenderizado y por los servidores efímeros de pruebas. La compilación y las pruebas se repitieron con permiso local de red y terminaron correctamente.
- Vite mostró un aviso deprecado de Node.js sobre `module.register()`; no impidió compilar ni probar.

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
