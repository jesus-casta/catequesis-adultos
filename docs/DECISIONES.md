# Decisiones de la primera implementación

28/08/2026 · Aplicación 0.1.0 · Basada en el análisis Word interno 0.2.

La autorización para construir una primera versión no resuelve automáticamente las decisiones pendientes del análisis. Las siguientes opciones permiten probar la aplicación con datos ficticios; deben validarse antes de usar información real.

| ID | Decisión aplicada | Estado y motivo |
| --- | --- | --- |
| D01 | Servidor Node.js local; sin despliegue AWS | Requisito del usuario. La escucha se limita a loopback. |
| D02 | Tres perfiles exclusivos por cuenta | Tres roles acordados. La exclusividad es provisional; no hay combinación de roles. |
| D03 | Catequista limitado a sus grupos | Acordado. Aplica a fichas, fotos y documentos desde el servidor. |
| D04 | Una persona, un grupo activo; uno o varios catequistas por grupo | Acordado. Los cambios de grupo corresponden a administración. |
| D05 | Arzobispado con grupos expresamente asignados y solo lectura | Provisional. No se concede acceso global por defecto. |
| D06 | Administración sin datos ampliados ni archivos | Restricción conservadora mientras se define ese permiso. Ve nombre y grupo para asignar. |
| D07 | Administración crea solo nombre, apellidos y grupo; catequista completa el resto | Provisional. CU-06 queda implementado parcialmente, no como alta completa por administrador. |
| D08 | Administración edita grupos y sus catequistas | Provisional donde el análisis no cerró quién mantenía los datos organizativos. |
| D09 | Tres niveles: confirmación, bautismo/comunión primero y segundo | Duraciones acordadas; representación en grupos separados provisional. No hay cambio automático de curso. |
| D10 | Fichas incompletas y estado sacramental «sin comprobar» | Provisional. Evita convertir ausencia de datos en «no». Solo nombre, apellidos y grupo son obligatorios para el alta mínima. |
| D11 | Fotografías 2 MB, documentos 5 MB; PNG/JPG/PDF | Límite técnico provisional. SVG/HTML y otros formatos se rechazan. |
| D12 | Certificados separados por participante, padrino de bautismo y padrino de confirmación | Propuesta del análisis. Se conserva el nombre del titular al subirlo. |
| D13 | Sin listado obligatorio, validación ni estado «expediente completo» | Pendiente aclarar «para bautismo, solo partida de nacimiento» y las exigencias a padrinos. |
| D14 | Sin borrado; fotos antiguas conservadas internamente; documentos acumulables | Conservación provisional. Aún no hay historial visible, restauración ni política de retención. |
| D15 | No cambiar el nombre de un padrino con documentos asociados | Salvaguarda provisional hasta definir sustitución e historial; evita reasignar certificados por error. |
| D16 | Grupo ocupado necesita un catequista activo; debe quedar un administrador activo | Regla de seguridad provisional. Se permiten grupos vacíos en preparación. |
| D17 | SQLite local incluye también los archivos | Decisión técnica reversible para una demo pequeña y sencilla de copiar. No es la selección definitiva para AWS. |
| D18 | Formularios sin DNI ni firma digital | Esos datos y su tratamiento no están acordados. El formulario firmado puede adjuntarse como archivo de prueba. |

## No implementado

- CU-12, importación de Excel: no se dispone del archivo ni de una correspondencia aprobada.
- Bajas, eliminación de datos/archivos, fusión de personas e histórico de pertenencias.
- Cursos/promociones como entidades, paso automático a segundo y finalización del itinerario.
- Recordatorios, mensajes, asistencia, calendario de sesiones o contenido formativo.
- Recuperación de acceso por correo y autenticación para producción.
- Listado oficial de documentos, validación de autenticidad y caducidades.
- Infraestructura AWS, red multiusuario, cifrado en reposo gestionado y plan de copias definitivo.

## Diferencias deliberadas respecto al análisis

CU-06 no concede al administrador acceso general a fichas: solo se implementa el alta mínima para permitir continuar el recorrido. El listado de administración tampoco incluye foto, fecha de nacimiento, contacto ni documentación. CU-07 y CU-11 funcionan con un ámbito de consulta del arzobispado explícito en lugar de global. Ambos puntos están señalados como provisionales en la aplicación.

El acceso a datos familiares se muestra como un bloque disponible, no condicionado de forma automática al estado de bautismo; la obligatoriedad sigue pendiente. Las búsquedas son locales a los registros autorizados que devuelve la API; no se consulta el resto del sistema.
