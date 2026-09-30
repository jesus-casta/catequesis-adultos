import { choice, fail, keys, text } from './validation.js';

export function calendarData(body) {
  keys(body,['groupId','date','startTime','endTime','topic','notes','status','version','kind']);
  const date=text(body.date,'Fecha',{required:true,max:10});
  const parsed=new Date(`${date}T12:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date||date<'1900-01-01'||date>'9999-12-31')fail(400,'Selecciona una fecha válida.');
  const startTime=text(body.startTime,'Hora de inicio',{required:true,max:5});
  const endTime=text(body.endTime,'Hora de finalización',{required:true,max:5});
  if(![startTime,endTime].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||endTime<=startTime)fail(400,'La hora final debe ser posterior a la inicial, en el mismo día.');
  return {kind:choice(body.kind??'session',['session','celebration'],'Tipo'),groupId:text(body.groupId,'Comunidad',{required:true,max:80}),date,startTime,endTime,
    topic:text(body.topic,'Tema',{required:true,max:240}),notes:text(body.notes??'','Notas',{max:4000}),
    status:choice(body.status??'scheduled',['scheduled','cancelled'],'Estado')};
}

export function presentEvent(event,canEdit) {
  return {id:event.id,groupId:event.group_id,date:event.date,startTime:event.start_time,endTime:event.end_time,
    kind:event.kind,topic:event.topic,notes:event.notes,status:event.status,version:event.version,canEdit};
}

export function weeklyDates(start, until) {
  until=text(until,'Fecha final',{required:true,max:10});
  const end=new Date(`${until}T12:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(until)||Number.isNaN(end.valueOf())||end.toISOString().slice(0,10)!==until||until<start)fail(400,'La fecha final debe ser válida e igual o posterior a la primera sesión.');
  const dates=[];
  const day=new Date(`${start}T12:00:00Z`);
  while(day<=end) {
    dates.push(day.toISOString().slice(0,10));
    if(dates.length>53)fail(400,'Crea como máximo 53 sesiones semanales cada vez.');
    day.setUTCDate(day.getUTCDate()+7);
  }
  return dates;
}
