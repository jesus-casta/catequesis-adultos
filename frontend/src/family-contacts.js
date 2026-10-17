const normalized=value=>(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function parentIndex(data={},parent) {
  const labels=parent==='mother'?['madre','mama','mother']:['padre','papa','father'];
  const matches=(data.guardians??[]).map((g,index)=>({g,index})).filter(({g})=>labels.includes(normalized(g.relationship)));
  return (matches.find(({g})=>g.primary)??matches[0])?.index??-1;
}
export function parentContact(data={},parent) {
  const guardian=data.guardians?.[parentIndex(data,parent)];
  return guardian?{name:guardian.name??'',phone:guardian.phone??'',email:guardian.email??''}:{name:data[parent]??'',phone:data[`${parent}Phone`]??'',email:data[`${parent}Email`]??''};
}
export function cleanPersonData(data) {
  return {...data,guardians:(data.guardians??[]).filter(g=>['name','relationship','phone','email'].some(key=>(g[key]??'').trim()))};
}
