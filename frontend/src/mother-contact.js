export function motherGuardianIndex(data={}) {
  const mothers=(data.guardians??[]).map((guardian,index)=>({guardian,index})).filter(({guardian})=>['madre','mama','mother'].includes((guardian.relationship??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()));
  return (mothers.find(({guardian})=>guardian.primary)??mothers[0])?.index??-1;
}
export function motherContact(data={}) {
  const index=motherGuardianIndex(data);
  if(index>=0){const mother=data.guardians[index];return {name:mother.name??'',phone:mother.phone??''};}
  return {name:data.mother??'',phone:data.motherPhone??''};
}
