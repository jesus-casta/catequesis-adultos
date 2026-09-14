import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResetMailer } from '../services/mail.js';

const env={CATEQUESIS_MAIL_FROM:'no-reply@gestioncatequesis.es',AWS_REGION:'eu-west-1'};
test('SES: configuración opcional, remitente y región válidos',()=>{
  assert.equal(createResetMailer({env:{}}),null);
  assert.throws(()=>createResetMailer({env:{...env,CATEQUESIS_MAIL_FROM:'bad\naddress'}}),/MAIL_FROM/);
  assert.throws(()=>createResetMailer({env:{CATEQUESIS_MAIL_FROM:env.CATEQUESIS_MAIL_FROM}}),/AWS_REGION/);
});
test('SES: mensaje privado, UTF-8, configuración de eventos y plazo de envío',async()=>{
  let sent;
  const send=createResetMailer({env:{...env,CATEQUESIS_SES_CONFIGURATION_SET:'catequesis'},client:{send:async(command,options)=>{sent={input:command.input,options};}}});
  const url='https://gestioncatequesis.es/#reset-password=example';
  await send({to:'persona@example.org',url});
  assert.deepEqual(sent.input.Destination,{ToAddresses:['persona@example.org']});
  assert.equal(sent.input.FromEmailAddress,env.CATEQUESIS_MAIL_FROM);
  assert.equal(sent.input.ConfigurationSetName,'catequesis');
  assert.equal(sent.input.Content.Simple.Body.Text.Charset,'UTF-8');
  assert(sent.input.Content.Simple.Body.Text.Data.includes(url));
  assert(sent.options.abortSignal instanceof AbortSignal);
  await assert.rejects(send({to:'bad\naddress',url}),/Destinatario/);
});
test('SES: propaga fallos para invalidar el enlace de recuperación',async()=>{
  const send=createResetMailer({env,client:{send:async()=>{throw new Error('SES unavailable');}}});
  await assert.rejects(send({to:'persona@example.org',url:'https://gestioncatequesis.es/'}),/SES unavailable/);
});
