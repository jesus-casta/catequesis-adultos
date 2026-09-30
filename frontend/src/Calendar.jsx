import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, RefreshCw, X } from 'lucide-react';
import { Button, Input, Label } from './components/ui.jsx';
import { localDate, monthDays, shiftMonth } from './calendar-dates.js';

const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('es-ES',{month:'long',year:'numeric'});
const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export default function Calendar({groups,catecheses,isAdmin,api,initialGroup='all'}) {
  const [month,setMonth]=useState(()=>localDate().slice(0,7));
  const [filter,setFilter]=useState(initialGroup),[day,setDay]=useState('');
  const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [reload,setReload]=useState(0),[editor,setEditor]=useState(null),[message,setMessage]=useState('');
  const editableGroups=groups.filter(g=>isAdmin||catecheses.find(c=>c.id===g.catechesisId)?.canManage);
  const groupMap=new Map(groups.map(g=>[g.id,g]));
  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');setEvents([]);
    api(`/api/calendar?month=${month}`).then(data=>{if(live)setEvents(data);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[month,reload]);
  const visible=events.filter(e=>groupMap.has(e.groupId)&&(filter==='all'||e.groupId===filter));
  const agenda=visible.filter(e=>!day||e.date===day);
  function move(next){setMonth(next);setDay('');setMessage('');}
  function create(){
    const group=editableGroups.find(g=>g.id===filter)??editableGroups[0];
    let date=day||(month===localDate().slice(0,7)?localDate():`${month}-01`);
    if(!day&&group){const next=new Date(`${date}T12:00:00`);const target=(weekdays.indexOf(group.day)+1)%7;next.setDate(next.getDate()+(target-next.getDay()+7)%7);date=localDate(next);}
    setEditor({date,groupId:group?.id});
  }
  async function saved(result,date){setEditor(null);setMonth(date.slice(0,7));setDay('');setReload(n=>n+1);setMessage(result.events.length===1?'Actividad guardada.':`${result.events.length} actividades semanales creadas. Ya puedes ajustar el tema de cada fecha.`);}
  return <div className="community-calendar">
    <div className="page-heading"><div><p className="eyebrow">EL CAMINO DE CADA COMUNIDAD</p><h1>Mi calendario</h1><p>Consulta las sesiones, sus temas y las celebraciones de tus comunidades.</p></div><div className="heading-actions"><Button variant="outline" disabled={loading} onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/>Actualizar</Button>{editableGroups.length>0&&<Button onClick={create}><Plus size={16}/>Programar actividad</Button>}</div></div>
    {message&&<p role="status" className="calendar-notice">{message}</p>}
    {error&&<p role="alert" className="error-box">{error}</p>}
    <section className="records-panel calendar-panel" aria-label="Calendario mensual" aria-busy={loading}>
      <div className="calendar-toolbar"><div className="calendar-month"><Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={()=>move(shiftMonth(month,-1))}><ChevronLeft/></Button><h2 aria-live="polite">{monthLabel(month)}</h2><Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={()=>move(shiftMonth(month,1))}><ChevronRight/></Button><Button variant="outline" size="sm" onClick={()=>{move(localDate().slice(0,7));setDay(localDate());}}>Hoy</Button></div><div className="field"><Label htmlFor="calendar-community">Comunidad</Label><select id="calendar-community" className="input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas mis comunidades</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div></div>
      <div className="calendar-grid"><div className="calendar-weekdays">{weekdays.map(d=><span key={d}><abbr title={d}>{d.slice(0,3)}</abbr></span>)}</div><div className="calendar-days">{monthDays(month).map((date,i)=>date?<button key={date} type="button" className={`calendar-day ${date===localDate()?'is-today':''} ${date===day?'is-selected':''}`} aria-pressed={date===day} aria-label={`${dateLabel(date)}: ${visible.filter(e=>e.date===date).length} actividades`} onClick={()=>setDay(date===day?'':date)}><span className="calendar-day-number">{Number(date.slice(-2))}</span><span className="calendar-day-events">{visible.filter(e=>e.date===date).map(e=><span key={e.id} className={`calendar-chip ${e.kind==='celebration'?'is-celebration':''} ${e.status==='cancelled'?'is-cancelled':''}`}><span>{e.startTime} · {groupMap.get(e.groupId)?.name}</span><strong>{e.kind==='celebration'?'Celebración · ':''}{e.status==='cancelled'?'Cancelada · ':''}{e.topic}</strong></span>)}</span>{visible.some(e=>e.date===date)&&<span className="calendar-mobile-count">{visible.filter(e=>e.date===date).length} act.</span>}</button>:<div key={`blank-${i}`} className="calendar-blank"/>)}</div></div>
    </section>
    <section className="calendar-agenda" aria-label="Sesiones, celebraciones y temas"><div className="section-heading"><h2>{day?dateLabel(day):'Actividades del mes'}</h2>{day&&<Button variant="ghost" onClick={()=>setDay('')}>Ver todo el mes</Button>}</div>
      {loading?<p role="status">Cargando calendario…</p>:!error&&!agenda.length?<div className="detail-card calendar-empty"><CalendarDays size={28}/><h3>{groups.length?'No hay actividades programadas en estas fechas':'Todavía no tienes comunidades asignadas'}</h3><p>{editableGroups.length?'Pulsa «Programar actividad» para preparar el calendario.':'Aquí aparecerán las fechas y los temas que programe administración.'}</p></div>:agenda.map(e=><article className={`detail-card calendar-session ${e.status==='cancelled'?'is-cancelled':''}`} key={e.id}><div className="calendar-session-date"><strong>{dateLabel(e.date)}</strong><span>{e.startTime}–{e.endTime}</span></div><div className="calendar-session-body"><p className="eyebrow">{groupMap.get(e.groupId)?.name}</p><p className="calendar-kind">{e.kind==='celebration'?'Celebración':'Sesión de catequesis'}</p><h3>{e.topic}</h3>{e.status==='cancelled'&&<p className="calendar-cancelled-label">Actividad cancelada</p>}{e.notes&&<p className="calendar-notes">{e.notes}</p>}</div>{e.canEdit&&<Button variant="outline" size="sm" onClick={()=>setEditor(e)}><Pencil size={14}/>Editar actividad</Button>}</article>)}
    </section>
    {editor&&<SessionEditor event={editor} groups={editableGroups} api={api} onClose={()=>setEditor(null)} onSaved={saved}/>}
  </div>;
}

function SessionEditor({event,groups,api,onClose,onSaved}) {
  const dialog=useRef(null);
  const existing=!!event.id;
  const initialGroup=groups.find(g=>g.id===event.groupId)??groups[0];
  const [groupId,setGroupId]=useState(initialGroup?.id??'');
  const [date,setDate]=useState(event.date),[until,setUntil]=useState('');
  const [weekly,setWeekly]=useState(!existing);
  const [start,setStart]=useState(event.startTime??initialGroup?.startTime??'19:00');
  const [end,setEnd]=useState(event.endTime??initialGroup?.endTime??'20:00');
  const [kind,setKind]=useState(event.kind??'session');
  const [topic,setTopic]=useState(event.topic??'Tema pendiente'),[notes,setNotes]=useState(event.notes??'');
  const [status,setStatus]=useState(event.status??'scheduled'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
  function chooseGroup(id){setGroupId(id);const g=groups.find(g=>g.id===id);if(g){setStart(g.startTime);setEnd(g.endTime);}}
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{
    const result=await api(existing?`/api/calendar/${event.id}`:'/api/calendar',existing?'PUT':'POST',{kind,groupId,date,startTime:start,endTime:end,topic,notes,status,...(existing?{version:event.version}:weekly?{untilDate:until}:{})});
    await onSaved(result,date);
  }catch(err){setError(err.message);}finally{setBusy(false);}}
  return <dialog ref={dialog} className="calendar-dialog" aria-labelledby="session-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><form onSubmit={submit}><header className="dialog-header"><div><h2 id="session-title">{existing?'Editar actividad':'Programar actividad'}</h2><p className="muted">{existing?'Los cambios afectan solo a esta fecha.':'Prepara las fechas y ajusta después el tema de cada sesión.'}</p></div><Button type="button" variant="ghost" size="icon" disabled={busy} onClick={onClose} aria-label="Cerrar"><X/></Button></header><div className="calendar-form-body">
    <div className="field"><Label htmlFor="event-kind">Tipo de actividad</Label><select id="event-kind" className="input" value={kind} onChange={e=>{setKind(e.target.value);if(!existing){setWeekly(e.target.value==='session');if(topic==='Tema pendiente'||!topic)setTopic(e.target.value==='celebration'?'':'Tema pendiente');}}}><option value="session">Sesión de catequesis</option><option value="celebration">Celebración</option></select></div>
    <div className="field"><Label htmlFor="session-community">Comunidad</Label><select id="session-community" className="input" required disabled={existing||busy} value={groupId} onChange={e=>chooseGroup(e.target.value)}>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></div>
    {!existing&&<div className="field"><Label htmlFor="session-repeat">Repetición</Label><select id="session-repeat" className="input" value={weekly?'weekly':'once'} onChange={e=>setWeekly(e.target.value==='weekly')}><option value="weekly">Cada semana</option><option value="once">Una sola actividad</option></select></div>}
    <div className="form-grid"><div className="field"><Label htmlFor="session-date">{weekly&&!existing?'Primera sesión':'Fecha'}</Label><Input id="session-date" type="date" min="1900-01-01" max="9999-12-31" required value={date} onChange={e=>{setDate(e.target.value);if(until&&e.target.value>until)setUntil(e.target.value);}}/></div>{weekly&&!existing&&<div className="field"><Label htmlFor="session-until">Repetir hasta</Label><Input id="session-until" type="date" min={date} max="9999-12-31" required value={until} onChange={e=>setUntil(e.target.value)}/></div>}</div>
    {weekly&&!existing&&<p className="form-note">Se crearán sesiones cada {date?new Date(`${date}T12:00:00`).toLocaleDateString('es-ES',{weekday:'long'}):'día elegido'}, desde la primera fecha hasta la fecha final. Máximo 53 sesiones. Puedes cancelar los festivos por separado.</p>}
    <div className="form-grid"><div className="field"><Label htmlFor="session-start">Desde</Label><Input id="session-start" type="time" required value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><Label htmlFor="session-end">Hasta</Label><Input id="session-end" type="time" required value={end} onChange={e=>setEnd(e.target.value)}/></div></div>
    <div className="field"><Label htmlFor="session-topic">{kind==='celebration'?'Nombre de la celebración':'Tema a dar'}</Label><Input id="session-topic" required maxLength={240} value={topic} onChange={e=>setTopic(e.target.value)}/></div><div className="field"><Label htmlFor="session-notes">Notas para la comunidad</Label><textarea id="session-notes" className="input" rows={4} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
    {existing&&<div className="field"><Label htmlFor="session-status">Estado</Label><select id="session-status" className="input" value={status} onChange={e=>setStatus(e.target.value)}><option value="scheduled">Programada</option><option value="cancelled">Cancelada</option></select></div>}
    {error&&<p role="alert" className="error-box">{error}</p>}
    </div><footer className="form-footer"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button><Button type="submit" disabled={busy||!groupId}>{busy?'Guardando…':existing?'Guardar actividad':weekly?'Crear actividades semanales':'Crear actividad'}</Button></footer></form></dialog>;
}
