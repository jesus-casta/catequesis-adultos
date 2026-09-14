# Recuperación de contraseña con Amazon SES y Docker

El backend envía mediante la API HTTPS de SES (puerto 443). No necesita SMTP, `sendmail`, buzones ni puertos de correo entrantes. Remitente previsto: `no-reply@gestioncatequesis.es`. La integración no crea recursos AWS ni configura el contenedor existente automáticamente.

## 1. Preparar AWS (en la región del dominio verificado)

- Comprueba que `gestioncatequesis.es` y su firma DKIM estén verificados en SES.
- Configura el tratamiento de rebotes y quejas: en la identidad, configura notificaciones SNS de **Bounce** y **Complaint**, suscribe un correo de administración y confirma la suscripción. Mantén habilitada la supresión de cuenta para ambos tipos. Administración debe revisar avisos y corregir o retirar direcciones afectadas; la aplicación no procesa estas notificaciones automáticamente.
- Solicita acceso a producción en SES → Account dashboard → Get set up → Request production access. Tipo **Transactional**, web `https://gestioncatequesis.es`. Explica que solo se envían recuperaciones solicitadas por usuarios registrados, sin marketing. Confirma las declaraciones del formulario después de configurar el procedimiento anterior.
- Mientras la cuenta esté en sandbox, verifica también la dirección destinataria de prueba. La aprobación y las identidades son regionales.

## 2. Autorizar a la aplicación

Usa un rol IAM de ejecución: rol de tarea en ECS (no el execution role), o perfil de instancia en EC2 accesible desde el contenedor. El SDK obtiene las credenciales automáticamente. No copies claves en el Dockerfile, la imagen ni GitHub.

La plantilla `deploy/ses-policy.example.json` permite exclusivamente `ses:SendEmail` desde el dominio y remitente previstos. Sustituye `REGION` y `ACCOUNT_ID` antes de adjuntarla al rol.

Si tu instalación no permite roles, proporciona `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` mediante el mecanismo de secretos del despliegue; para credenciales temporales incluye también `AWS_SESSION_TOKEN`. Son credenciales de API AWS, **no credenciales SMTP de SES**. No guardes sus valores en archivos versionados.

## 3. Actualizar el Docker existente

En el otro ordenador, descarga los cambios de GitHub. La imagen debe instalar las nuevas dependencias de `package-lock.json`:

```dockerfile
# Fragmento para la etapa de ejecución de tu Dockerfile existente
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
```

Conserva la compilación del frontend (`npm ci` y `npm run build` en la etapa de construcción), el backend, `dist/client` y el volumen persistente de SQLite. Haz una copia de seguridad antes de actualizar. No elimines volúmenes al recrear el contenedor. El backend crea la tabla de enlaces al abrir la base; no hay que reinicializar usuarios ni datos.

El `compose.yaml` del repositorio ya pasa las variables de SES al servicio **adultos**. Conserva `network_mode: host`, la escucha en `127.0.0.1`, el proxy HTTPS y el volumen de datos existentes.

Crea un archivo `.env` junto a `compose.yaml` en el servidor (no se sube a Git ni se copia a la imagen):

```env
CATEQUESIS_MAIL_FROM=no-reply@gestioncatequesis.es
AWS_REGION=REGION_DEL_DOMINIO_VERIFICADO
```

Sustituye la región por la real, por ejemplo `eu-west-1` solo si verificaste allí el dominio. El archivo `.env` permite interpolar las variables de Compose; las credenciales no se pasan automáticamente al contenedor. Usa el rol IAM descrito arriba, o configura explícitamente la inyección de secretos en tu despliegue si necesitas credenciales de API.

Opcional: `CATEQUESIS_SES_CONFIGURATION_SET` selecciona un conjunto de configuración SES ya creado para registrar eventos. Si no utilizas uno, omite la variable.

Desde el repositorio actualizado, reconstruye y recrea la aplicación:

```bash
git pull --ff-only
docker compose up -d --build adultos
docker compose logs --tail=100 adultos
```

Si el despliegue usa imágenes publicadas en un registro, construye/publica la imagen mediante vuestro flujo habitual y actualiza el servicio a esa versión. Reiniciar una imagen antigua no incorpora las dependencias ni el nuevo código.

## 4. Comprobar la entrega real

1. En Administración → Usuarios, registra el correo de una cuenta de prueba activa.
2. Cierra sesión y utiliza «¿Has olvidado tu contraseña?» con su **nombre de usuario**.
3. Comprueba que el correo llega y el enlace abre `https://gestioncatequesis.es/`.
4. Cambia la contraseña y entra con la nueva. Comprueba que el enlace ya no funciona al reutilizarlo.

Las pruebas automáticas utilizan un cliente SES simulado; no envían correos ni prueban tu cuenta AWS. El mensaje genérico del formulario no garantiza la entrega. Si aparece «No se pudo entregar un correo de recuperación» en los logs, revisa región, rol/credenciales, permisos, sandbox, supresión del destinatario y conectividad HTTPS. No se imprimen enlaces, destinatarios ni credenciales en los logs.

Sin `CATEQUESIS_MAIL_FROM`, la recuperación muestra que el correo no está disponible. Si defines remitente pero no `AWS_REGION`, el arranque falla con una explicación. Quitar el remitente y recrear el contenedor permite desactivar temporalmente el envío sin afectar al inicio de sesión.

## Referencias

- [Credenciales del SDK en Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [Acceso a producción de SES](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [Notificaciones de SES por SNS](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications-sns.html)
