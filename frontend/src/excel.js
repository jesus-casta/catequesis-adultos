import { orderPeople } from './people-order.js';

const loadExcelJS = () => import('exceljs').then(module=>module.default??module);

const PERSON_HEADERS = ['Referencia','ID ficha','Nombre','Apellidos','ID grupo','Grupo','Fecha de nacimiento','Lugar de nacimiento','Teléfono','Correo electrónico','Domicilio','Localidad','Provincia','Código postal','País','Bautismo','Primera comunión','Confirmación','Año de Primera Comunión','Padrino/madrina de bautismo','Padrino/madrina de confirmación','Colegio'];
const GUARDIAN_HEADERS = ['Referencia persona','Nombre','Parentesco','Teléfono','Correo electrónico','Contacto principal'];
const STATUS_IMPORT = {'si':'yes','sí':'yes','yes':'yes','no':'no','sin comprobar':'unknown','desconocido':'unknown','unknown':'unknown','':'unknown'};

const stringValue = value => {
  if(value===null||value===undefined)return '';
  if(value instanceof Date)return value.toISOString().slice(0,10);
  if(typeof value==='object')return String(value.text??value.result??'').trim();
  return String(value).trim();
};
const normalized = value => stringValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const safeName = value => normalized(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'catequesis';
const rowsFrom = worksheet => {
  if(!worksheet)return [];
  const headers=[];worksheet.getRow(1).eachCell({includeEmpty:true},(cell,column)=>{headers[column]=stringValue(cell.value);});
  const rows=[];
  worksheet.eachRow((row,index)=>{if(index===1)return;const item={};let used=false;headers.forEach((header,column)=>{if(!header)return;const value=stringValue(row.getCell(column).value);item[header]=value;if(value)used=true;});if(used)rows.push({...item,_row:index});});
  return rows;
};
const requireHeaders = (worksheet, expected, sheetName) => {
  if(!worksheet)throw new Error(`Falta la hoja «${sheetName}».`);
  const actual=[];worksheet.getRow(1).eachCell({includeEmpty:true},cell=>actual.push(stringValue(cell.value)));
  const missing=expected.filter(header=>!actual.includes(header));
  if(missing.length)throw new Error(`La hoja «${worksheet.name}» no tiene estas columnas: ${missing.join(', ')}.`);
};
const styleSheet = (sheet, widths) => {
  sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:`${sheet.getColumn(sheet.columnCount).letter}1`};
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF315C4B'}};sheet.getRow(1).alignment={vertical:'middle'};
  widths.forEach((width,index)=>{sheet.getColumn(index+1).width=width;});
};

export async function exportCatechesisExcel(catechesis,groups,people) {
  const ExcelJS=await loadExcelJS();
  const workbook=new ExcelJS.Workbook();workbook.creator='Gestión de catequesis';workbook.created=new Date();
  const listing=workbook.addWorksheet('Listado por grupos');
  listing.addRow(['Grupo','Nombre','Apellidos','Nombre de la madre','Teléfono de la madre','Correo de la madre','Nombre del padre','Teléfono del padre','Correo del padre','Fecha de nacimiento','Colegio','Dirección']);
  const orderedPeople=orderPeople(people,groups,'course');
  for(const person of orderedPeople) {
    const d=person.data??{},group=groups.find(item=>item.id===person.groupId);
    const contact=relationship=>(d.guardians??[]).find(guardian=>normalized(guardian.relationship)===relationship);
    const mother=contact('madre'),father=contact('padre');
    const row=listing.addRow([group?.name??'',person.firstName??'',person.lastName??'',mother?.name||d.mother||'',mother?.phone||d.motherPhone||'',mother?.email||d.motherEmail||'',father?.name||d.father||'',father?.phone||d.fatherPhone||'',father?.email||d.fatherEmail||'',d.birthDate?new Date(`${d.birthDate}T12:00:00Z`):null,d.school??'',d.address??'']);
    row.getCell(10).numFmt='dd/mm/yyyy';
  }
  styleSheet(listing,[28,22,28,30,22,34,30,22,34,22,30,44]);
  listing.getRow(1).alignment={vertical:'middle',wrapText:true};listing.getRow(1).height=32;
  listing.views=[{state:'frozen',xSplit:1,ySplit:1}];
  const bytes=await workbook.xlsx.writeBuffer();
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`${safeName(catechesis.name)}.xlsx`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function parseCatechesisExcel(file) {
  if(!file||!file.name.toLocaleLowerCase('es').endsWith('.xlsx'))throw new Error('Selecciona un archivo Excel con extensión .xlsx.');
  if(file.size>5*1024*1024)throw new Error('El Excel supera los 5 MB permitidos.');
  const ExcelJS=await loadExcelJS(),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
  const personSheet=workbook.getWorksheet('Personas'),guardianSheet=workbook.getWorksheet('Tutores');
  requireHeaders(personSheet,PERSON_HEADERS.slice(0,5),'Personas');requireHeaders(guardianSheet,GUARDIAN_HEADERS.slice(0,2),'Tutores');
  const personRows=rowsFrom(personSheet),guardianRows=rowsFrom(guardianSheet),references=new Set(),errors=[];
  const people=personRows.map(row=>{
    const reference=row['Referencia'];
    if(!reference)errors.push(`Personas, fila ${row._row}: falta la Referencia.`);else if(references.has(reference))errors.push(`Personas, fila ${row._row}: la Referencia «${reference}» está repetida.`);else references.add(reference);
    const status=(label)=>{const raw=normalized(row[label]);if(!(raw in STATUS_IMPORT)){errors.push(`Personas, fila ${row._row}: «${label}» debe ser Sí, No o Sin comprobar.`);return 'unknown';}return STATUS_IMPORT[raw];};
    return {reference,id:row['ID ficha'],firstName:row['Nombre'],lastName:row['Apellidos'],groupId:row['ID grupo'],data:{birthDate:row['Fecha de nacimiento'],birthPlace:row['Lugar de nacimiento'],phone:row['Teléfono'],email:row['Correo electrónico'],address:row['Domicilio'],city:row['Localidad'],province:row['Provincia'],postalCode:row['Código postal'],country:row['País'],school:row['Colegio']??'',baptism:status('Bautismo'),communion:status('Primera comunión'),confirmation:status('Confirmación'),communionYear:row['Año de Primera Comunión'],baptismSponsor:row['Padrino/madrina de bautismo'],confirmationSponsor:row['Padrino/madrina de confirmación'],guardians:[]}};
  });
  for(const row of guardianRows){const person=people.find(item=>item.reference===row['Referencia persona']);if(!person){errors.push(`Tutores, fila ${row._row}: la referencia «${row['Referencia persona']}» no existe en Personas.`);continue;}const primary=normalized(row['Contacto principal']);if(!['si','sí','yes','no',''].includes(primary))errors.push(`Tutores, fila ${row._row}: Contacto principal debe ser Sí o No.`);person.data.guardians.push({name:row['Nombre'],relationship:row['Parentesco'],phone:row['Teléfono'],email:row['Correo electrónico'],primary:['si','sí','yes'].includes(primary)});}
  return {people,errors,fileName:file.name};
}
