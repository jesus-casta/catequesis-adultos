export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function shiftMonth(month, offset) {
  const [year,m]=month.split('-').map(Number);
  return localDate(new Date(year,m-1+offset,1)).slice(0,7);
}
export function monthDays(month) {
  const [year,m]=month.split('-').map(Number);
  const first=new Date(year,m-1,1);
  const offset=(first.getDay()+6)%7;
  const count=new Date(year,m,0).getDate();
  return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset||i>=offset+count?null:`${month}-${String(i-offset+1).padStart(2,'0')}`);
}
