# Guía para revisar la versión 0.1

Esta aplicación es una primera propuesta funcional. Puedes comentar cada bloque por separado, sin cerrar aún el proyecto entero.

## 1. Recorrerla como catequista

Entra como `ana` usando la contraseña de demostración del README. Verás cinco personas: tres en confirmación y dos en primero de bautismo y comunión. Las personas de segundo no aparecen porque Ana no tiene asignado ese grupo.

Busca «Clara», abre su ficha y recorre sus pestañas:

- **Datos personales:** identificación, contacto, domicilio y grupo.
- **Sacramentos y familia:** estados «sí», «no» y «sin comprobar»; padrinos y datos familiares.
- **Documentación:** archivos realmente recibidos, separados por titular.

En «Editar ficha», cambia una localidad ficticia y guarda. Vuelve al listado, abre la ficha y comprueba que se conserva. Detener y arrancar la aplicación tampoco borra el cambio.

«Cancelar» o cerrar un formulario descarta lo que no hayas guardado. Si otro catequista modifica el registro mientras lo editas, se rechaza el guardado antiguo: cierra y vuelve a abrir la ficha, revisa la nueva versión y reaplica tus cambios. No hay combinación automática.

## 2. Foto y documentación

Usa únicamente una imagen de prueba y un PDF ficticio.

1. Abre una ficha y pulsa «Subir foto». Selecciona un PNG o JPG de hasta 2 MB, revisa la vista previa y confirma.
2. Abre «Documentación» y pulsa «Adjuntar documento».
3. Selecciona el tipo y el titular. Para certificados de padrinos debe existir previamente su nombre en la ficha.
4. Selecciona un PDF, PNG o JPG de hasta 5 MB y confirma.
5. Pulsa «Consultar»: el navegador abre el archivo en otra pestaña, con comprobación de permisos.

El navegador puede ofrecer descargar, imprimir o copiar el archivo. Esta aplicación no pretende impedir esas acciones tras autorizar su lectura.

La foto nueva pasa a ser la visible. Sus versiones anteriores se conservan internamente, sin interfaz de historial. Los documentos nuevos no sustituyen los anteriores. El mismo contenido para el mismo tipo y titular se rechaza como duplicado. Ningún archivo se declara válido por el mero hecho de subirlo.

## 3. Compartir un grupo

Sal y entra como `luis`. Luis puede consultar y modificar las mismas personas de confirmación, pero ve segundo en lugar de primero. Si editas la ficha de Clara, Ana verá los cambios al actualizar.

Para comprobar un conflicto real, puedes usar ventanas privadas o navegadores diferentes: una sesión por contexto de navegador. No cambies de usuario en dos pestañas del mismo contexto esperando dos sesiones independientes: comparten la cookie.

## 4. Revisar el perfil del arzobispado

Entra como `consulta`. Su ámbito inicial es confirmación. Verás tres personas y podrás abrir sus documentos, pero no aparecerán acciones de edición o carga. El servidor también rechaza esas operaciones, aunque se intente llamar a la API directamente.

## 5. Administración

Entra como `admin`.

- **Personas y asignaciones:** solo muestra nombre, apellidos y grupo. Permite crear una ficha mínima y cambiar su grupo. Los demás datos los completa el catequista.
- **Grupos:** crea o modifica nombre, parroquia, día, hora inicial/final e itinerario. Selecciona uno o varios catequistas.
- **Usuarios:** crea cuentas, asigna perfil y grupos, cambia contraseña o desactiva. Dejar un catequista o lector sin grupos significa que no verá ninguna ficha.

Los grupos en preparación pueden estar vacíos y sin catequistas. Para asignarles personas deben tener al menos un catequista activo. No se puede retirar al último catequista de un grupo ocupado ni dejar el sistema sin administrador activo.

### Probar un traslado

Asigna a Diego a segundo. Ana dejará de poder abrir su ficha y documentos; Luis podrá consultarlos. La persona no se duplica y conserva sus archivos. Este paso es manual: no hay promoción por fecha ni comprobación de que el traslado sea pastoralmente adecuado.

### Probar una nueva cuenta

Crea un usuario de consulta sin grupos, con contraseña de 12 caracteres o más. Entra con él: su listado estará vacío. Asigna después un grupo desde administración y vuelve a entrar. Ya podrá consultar ese grupo.

## 6. Preguntas útiles para comentar

1. ¿La ficha está dividida de forma cómoda? ¿Qué dato falta o sobra?
2. ¿Quieres que las altas las haga administración o cada catequista en sus grupos?
3. ¿El arzobispado consultará todos los grupos o un conjunto asignado?
4. ¿Primero y segundo como grupos separados reflejan vuestra organización?
5. ¿Qué documentos son obligatorios según el participante y los padrinos?
6. ¿Qué debe conservarse cuando cambian grupo, curso o padrinos?

No hay que responder todo de una vez. El Excel real, preferiblemente anonimizado, sigue pendiente y será necesario antes de diseñar su importación.
