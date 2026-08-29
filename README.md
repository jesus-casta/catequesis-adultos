# Catequesis de adultos · primera versión local

Versión 0.1.0 · 28 de agosto de 2026 · Para probar y comentar.

Aplicación web con servidor **Node.js**, datos y archivos en SQLite local y una interfaz React. No está desplegada en AWS ni en Internet. No es una versión de producción y debe utilizarse solo con información ficticia.

## Arranque rápido del ZIP

1. Instala o utiliza **Node.js 24 o superior**. Se ha comprobado con Node.js 24.19.0.
2. Descomprime todo el ZIP en una carpeta. No abras `dist/client/index.html` directamente: necesita el servidor.
3. Abre una terminal en la carpeta que contiene este README y ejecuta:

```sh
npm start
```

También puedes arrancar sin npm:

```sh
node local/server.mjs --demo
```

4. Abre [la aplicación local](http://localhost:3000).
5. Para detenerla, pulsa `Ctrl+C` en la terminal.

El ZIP incluye la interfaz compilada. **No hace falta instalar dependencias para probarlo.** Solo se requieren al modificar y recompilar la interfaz.

Si el puerto está ocupado, en macOS/Linux:

```sh
CATEQUESIS_PORT=3001 npm start
```

En PowerShell: `$env:CATEQUESIS_PORT = '3001'`, después `npm start`. Abre entonces `http://localhost:3001`.

## Cuentas de demostración

Todas usan la contraseña **`Catequesis-demo-2026!`**. La pantalla de acceso permite rellenar cada perfil de prueba.

| Usuario | Perfil | Ámbito inicial |
| --- | --- | --- |
| `ana` | Catequista | Confirmación y primero de bautismo/comunión |
| `luis` | Catequista | Confirmación y segundo de bautismo/comunión |
| `consulta` | Responsable del arzobispado | Solo confirmación, sin edición |
| `admin` | Administración | Usuarios, grupos, altas mínimas y asignaciones; sin contenido ampliado ni archivos |

Hay siete personas ficticias, tres grupos y cuatro cuentas. No se han incorporado datos personales reales ni certificados. Las cuentas iniciales no se vuelven a crear ni se restablecen sus contraseñas al reiniciar.

## Qué se puede probar

- Consultar fichas y buscar por nombre o correo; filtrar por grupo.
- Completar datos personales, sacramentales, familiares y de padrinos.
- Subir y consultar una foto, y adjuntar documentos PDF/JPG/PNG.
- Crear grupos con parroquia, día y horario y asignar varios catequistas.
- Mantener una única asignación activa por persona.
- Gestionar cuentas y limitar el ámbito del perfil de consulta.
- Ver avisos de datos inválidos, permisos retirados, duplicados y modificaciones simultáneas.

La guía está dentro de la aplicación y en [docs/GUIA.md](docs/GUIA.md). Las decisiones provisionales están en [docs/DECISIONES.md](docs/DECISIONES.md).

## Dónde quedan los datos

Al arrancar se crea `local-data/catequesis.sqlite` junto al proyecto. Contiene fichas, usuarios, contraseñas derivadas mediante scrypt, sesiones y los bytes de fotos y documentos. Los datos no dependen del almacenamiento del navegador. Reiniciar no los borra.

Para conservar una copia de prueba, detén la aplicación y copia la carpeta `local-data` completa. Para empezar otra demostración sin perder la anterior, detén la aplicación y **renombra** esa carpeta, por ejemplo a `local-data-anterior`; el siguiente arranque creará otra. No ejecutes dos procesos sobre la misma carpeta.

## Desarrollo y comprobaciones

Para modificar la interfaz:

```sh
npm ci
npm run typecheck
npm run build
npm run test:local
```

Después arranca de nuevo con `npm start`. `npm run build` conserva el flujo de compilación Vinext del proyecto. El script de compilación requiere Bash y GNU `timeout` (en macOS, disponible con GNU coreutils). Si esa utilidad no está instalada, se puede usar directamente la misma compilación:

```sh
npx vinext build
```

`npm run dev` conserva el servidor de desarrollo de la interfaz: no inicia la API local. Para revisar esta entrega completa utiliza `npm start` sobre la interfaz compilada. No publiques directamente la salida estática como si incluyese el servidor y sus permisos.

Más detalle: [arquitectura y API](docs/ARQUITECTURA.md), [pruebas y cobertura](docs/PRUEBAS.md), [registro de versión](docs/CAMBIOS.md).

## Límites importantes

- **Solo datos ficticios.** Las contraseñas de la demo son públicas y no debe exponerse el servidor a Internet.
- Solo escucha en `127.0.0.1`; no sirve para que otros ordenadores se conecten en esta versión.
- Fotografías PNG/JPG: hasta 2 MB. Documentos PDF/PNG/JPG: hasta 5 MB. La validación de formato es básica, no un antivirus ni una validación documental.
- No hay importación del Excel, borrado, promoción automática, recuperación por correo ni lista cerrada de documentos obligatorios.
- Los permisos de altas y consulta del arzobispado son **provisionales** y se explican en el registro de decisiones.
- La base no tiene cifrado propio en reposo. No se ha realizado una auditoría de seguridad ni una validación jurídica.

El análisis de referencia sigue siendo el [Word de análisis y casos de uso](https://docs.google.com/document/d/1rxILLEIo2CImPmPEatkQq5oflL01AR8M/edit), versión interna 0.2. Esta entrega no convierte sus cuestiones pendientes en acuerdos definitivos ni modifica aquel documento.
