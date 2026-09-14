import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const address=/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

// Credentials come from the AWS SDK chain (task/instance role or environment).
export function createResetMailer({env=process.env,client}={}) {
  const from=env.CATEQUESIS_MAIL_FROM;
  if(!from)return null;
  if(!address.test(from))throw new Error('CATEQUESIS_MAIL_FROM debe ser una dirección de correo válida.');
  const region=env.AWS_REGION;
  if(!region)throw new Error('Configura AWS_REGION con la región donde verificaste el dominio en SES.');
  const ses=client??new SESv2Client({region,maxAttempts:2});
  return async ({to,url})=>{
    if(!address.test(to))throw new Error('Destinatario inválido.');
    const command=new SendEmailCommand({
      FromEmailAddress:from,
      Destination:{ToAddresses:[to]},
      ...(env.CATEQUESIS_SES_CONFIGURATION_SET?{ConfigurationSetName:env.CATEQUESIS_SES_CONFIGURATION_SET}:{}),
      Content:{Simple:{
        Subject:{Data:'Recuperar acceso a Catequesis',Charset:'UTF-8'},
        Body:{Text:{Data:`Para elegir una nueva contraseña, abre este enlace:\n\n${url}\n\nCaduca en 30 minutos y solo puede utilizarse una vez.\nSi no lo has solicitado, puedes ignorar este mensaje.`,Charset:'UTF-8'}}
      }}
    });
    await ses.send(command,{abortSignal:AbortSignal.timeout(10000)});
  };
}
