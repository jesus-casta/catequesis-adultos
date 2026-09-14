export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new AppError(status, message); };
export const ROLES = ['admin', 'catechist', 'reader'];
export const ITINERARIES = ['confirmation', 'baptism-1', 'baptism-2', 'first-communion'];
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DOC_TYPES = ['birth', 'baptism', 'sponsor-confirmation', 'registration'];
export const OWNER_TYPES = ['participant', 'baptismSponsor', 'confirmationSponsor'];
export const FIELDS = ['birthDate', 'birthPlace', 'phone', 'email', 'address', 'city', 'province', 'postalCode', 'country', 'baptism', 'communion', 'confirmation', 'father', 'fatherBirth', 'mother', 'motherBirth', 'paternalGrandfather', 'paternalGrandfatherBirth', 'paternalGrandmother', 'paternalGrandmotherBirth', 'maternalGrandfather', 'maternalGrandfatherBirth', 'maternalGrandmother', 'maternalGrandmotherBirth', 'baptismSponsor', 'confirmationSponsor'];
export function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Se esperaba un objeto de datos.');
  return value;
}
export function keys(value, allowed) {
  object(value);
  if (Object.keys(value).some(k => !allowed.includes(k))) fail(400, 'La solicitud contiene campos no permitidos.');
}
export function text(value, label, { required = false, max = 160 } = {}) {
  if (typeof value !== 'string') fail(400, `${label}: introduce un texto válido.`);
  const v = value.trim();
  if ((required && !v) || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) fail(400, `${label}: revisa su contenido o longitud.`);
  return v;
}
export function choice(value, allowed, label) {
  if (!allowed.includes(value)) fail(400, `${label}: selecciona una opción válida.`);
  return value;
}
export function ids(value) {
  if (!Array.isArray(value) || value.length > 100 || value.some(v => typeof v !== 'string')) fail(400, 'La asignación de grupos o catequistas no es válida.');
  return [...new Set(value)];
}
export function version(value, record) {
  if (!Number.isInteger(value) || value !== record.version) fail(409, 'Otra persona ha actualizado este registro. Cierra y vuelve a abrirlo antes de guardar.');
}
export function personalData(value) {
  keys(value, FIELDS);
  const result = {};
  for (const key of FIELDS) {
    if (['baptism', 'communion', 'confirmation'].includes(key)) result[key] = choice(value[key] ?? 'unknown', ['yes', 'no', 'unknown'], key);
    else result[key] = text(value[key] ?? '', key, { max: key === 'address' ? 300 : 160 });
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) fail(400, 'El correo electrónico no es válido.');
  if (result.birthDate) {
    const d = new Date(`${result.birthDate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.birthDate) || Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== result.birthDate || result.birthDate > new Date().toISOString().slice(0, 10) || result.birthDate < '1900-01-01') fail(400, 'La fecha de nacimiento no es válida.');
  }
  return result;
}
export function filePayload(body, photo = false) {
  const max = (photo ? 2 : 5) * 1024 * 1024;
  const name = text(body.name, 'Nombre de archivo', { required: true, max: 180 }).replace(/[\\/\r\n"]/g, '_');
  if (typeof body.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64)) fail(400, 'El archivo no se ha recibido correctamente.');
  const bytes = Buffer.from(body.base64, 'base64');
  if (!bytes.length || bytes.length > max) fail(400, `El archivo debe ocupar entre 1 byte y ${photo ? 2 : 5} MB.`);
  const png = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const pdf = bytes.subarray(0, 5).toString() === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF'));
  const mime = png ? 'image/png' : jpg ? 'image/jpeg' : pdf && !photo ? 'application/pdf' : null;
  if (!mime) fail(400, photo ? 'Solo se admiten fotos PNG o JPG reconocibles.' : 'Solo se admiten archivos PDF, PNG o JPG reconocibles.');
  return { name, mime, bytes };
}
