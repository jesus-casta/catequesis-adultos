# Arquitectura local 0.1

## Estructura

La aplicación separa interfaz, permisos y almacenamiento:

| Parte | Ubicación | Responsabilidad |
| --- | --- | --- |
| Interfaz React | `app/catequesis-app.tsx` | Listados, ficha, formularios y guía de revisión. |
| Presentación | `app/globals.css` | Composición adaptable, navegación, tablas y formularios. |
| Componentes de interfaz | `components/ui` | Primitivas accesibles de diálogos, pestañas, tablas, selección y navegación. |
| Servidor Node.js | `local/server.mjs` | HTTP, sesiones, autorizaciones, API, CSRF y archivos privados. |
| Datos | `local/store.mjs` | Esquema SQLite, transacciones, datos ficticios y consultas de permisos. |
| Validaciones | `local/validation.mjs` | Campos permitidos, tipos, fechas, versiones y formatos de archivos. |
| Pruebas | `local/tests` | Contratos HTTP, permisos, archivos, persistencia e interfaz compilada. |
| Interfaz distribuible | `dist/client` | HTML, CSS y JS estáticos servidos por Node; incluido en el ZIP. |

El navegador habla con el mismo origen local. No hay llamadas a AWS, Drive, analítica, fuentes remotas ni servicios externos desde la aplicación. La consulta a Drive solo se utilizó para leer el análisis durante el desarrollo, no es una integración del producto.

El proyecto conserva el compilador Vinext/Vite y la estructura de origen del entorno de creación. Se usa exportación estática para la interfaz, y el backend de esta entrega es Node.js, no un Worker. No se han activado D1/R2 ni una autenticación dependiente de ChatGPT. La salida estática por sí sola no es una aplicación multiusuario segura: necesita la API local.

## Modelo de datos

`users` conserva identidad, perfil, estado, hash de contraseña y versión. `groups` contiene parroquia, día, horario, itinerario y versión. `scopes` relaciona usuarios con grupos: para catequistas representa capacidad de gestión; para lectores, consulta.

`people.group_id` es obligatorio y referencia un único grupo. Los campos personales se guardan como un objeto JSON validado, sin almacenar campos arbitrarios enviados por el cliente. `photo_id` apunta a la foto visible.

`files` conserva metadatos, titular capturado, digest SHA-256 y bytes. Las fotos anteriores permanecen almacenadas, pero solo se muestra la actual. `sessions` conserva el hash del token aleatorio, usuario, CSRF y expiración. `audit` registra actor, tipo de acción, ID afectado y fecha; no copia los datos personales ni ofrece una interfaz de consulta todavía.

Los cambios relacionados se hacen dentro de transacciones SQLite. El control optimista `version` rechaza guardados desde una versión antigua. Los cambios de asignaciones incrementan también las versiones relacionadas de grupos/usuarios para evitar pérdidas silenciosas.

## API

Todos los recursos privados exigen sesión activa. Toda mutación autenticada exige además `X-CSRF-Token` y verifica el origen cuando se envía. Las respuestas privadas y los archivos llevan `Cache-Control: no-store`.

| Método y ruta | Permiso / comportamiento |
| --- | --- |
| `GET /api/meta` | Público local; versión y límites, sin registros personales. |
| `POST /api/login` | Usuario/contraseña; cookie HttpOnly, SameSite=Strict. |
| `GET /api/session` | Usuario actual y token CSRF. |
| `POST /api/logout` | Revoca la sesión. |
| `GET /api/groups` | Administración: todos; resto: asignados. |
| `POST /api/groups` | Administración; grupo y catequistas. |
| `PUT /api/groups/:id` | Administración; requiere versión. |
| `GET /api/users` | Administración; nunca devuelve hashes de contraseña. |
| `POST /api/users` | Administración; alta, perfil y grupos. |
| `PUT /api/users/:id` | Administración; requiere versión; cambios sensibles revocan sesiones. |
| `GET /api/people` | Catequista/lector: ámbito propio. Administración: solo nombre, ID, grupo y versión. |
| `POST /api/people` | Administración; alta mínima. |
| `GET /api/people/:id` | Catequista/lector dentro de su ámbito. |
| `PUT /api/people/:id` | Catequista dentro de su ámbito, con versión. No permite cambiar grupo. |
| `PUT /api/people/:id/group` | Administración; única asignación activa y actualización de permisos. |
| `POST /api/people/:id/photo` | Catequista del grupo; nombre, base64 y versión. |
| `POST /api/people/:id/documents` | Catequista; añade tipo y titular, con versión. |
| `GET /api/files/:id` | Catequista/lector con permiso actual sobre la persona; comprueba acceso incluso con enlace directo. |

Respuestas de error: 400 datos inválidos, 401 sesión no válida, 403 operación prohibida, 404 recurso no disponible/no autorizado, 409 conflicto o duplicado, 413 tamaño excesivo, 415 contenido no admitido, 421 Host no local y 429 límite de acceso.

## Seguridad de esta demostración

La escucha se limita a `127.0.0.1` y a Host `localhost`/`127.0.0.1` con el puerto actual. La API no acepta identidades o roles enviados por el navegador como prueba de autorización. Los permisos se vuelven a comprobar después de leer el cuerpo de una petición, para contemplar retiradas de acceso durante una carga.

Se utilizan consultas preparadas, listas de campos permitidos, contraseñas derivadas mediante scrypt, tokens aleatorios guardados como hash, sesiones de ocho horas, bloqueo temporal tras ocho intentos fallidos, CSRF, controles de origen y cabeceras contra interpretación de contenido. El HTML estático recibe un nonce para sus scripts; los archivos se sirven con CSP sandbox.

La cookie no lleva `Secure` porque el arranque es HTTP de loopback; no reutilizar esta configuración para un servidor remoto. Los límites de intentos viven en memoria del proceso y se reinician al detenerlo. La validación de archivos detecta firmas básicas y tamaño: no garantiza integridad completa, ausencia de malware ni autenticidad de certificados. El acceso al sistema operativo y al archivo SQLite permite ver su contenido: no hay cifrado propio de la base.

## Referencias técnicas utilizadas

- [Node.js: SQLite](https://nodejs.org/api/sqlite.html), para la API `DatabaseSync` y sus consultas.
- [Node.js: crypto](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), para scrypt y las primitivas criptográficas.
- [Node.js: test runner](https://nodejs.org/api/test.html), para las pruebas automatizadas.

Las referencias explican las APIs; no certifican la seguridad o adecuación de esta aplicación. SQLite y su API deberán revisarse de nuevo al elegir la arquitectura definitiva.
