const MB=1024*1024;
export function fitImage(width,height,maxEdge) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('La imagen no tiene dimensiones válidas.');
  const scale=Math.min(1,maxEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
async function decodeImage(file) {
  // Los navegadores actuales aplican la orientación EXIF al decodificar.
  if(typeof createImageBitmap==='function') {
    try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{/* Algunos móviles necesitan el decodificador de Image. */}
  }
  const url=URL.createObjectURL(file);
  try {
    return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('No se puede abrir esta imagen. Si es HEIC/HEIF, expórtala como JPG desde Fotos y vuelve a seleccionarla.'));image.src=url;});
  } finally {URL.revokeObjectURL(url);}
}
export async function prepareUpload(file,kind) {
  const photo=kind==='photo',limit=(photo?2:5)*MB;
  const isImage=file.type.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
  if(!isImage) {
    if(photo)throw new Error('Selecciona una imagen para la foto.');
    if(file.size>limit)throw new Error('El documento supera los 5 MB permitidos.');
    return file;
  }
  if(file.size>40*MB)throw new Error('La imagen supera los 40 MB de entrada. Expórtala con menor tamaño.');
  const image=await decodeImage(file);
  let canvas;
  try {
    const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
    const target=(photo?0.5:1.5)*MB,maxEdge=photo?1600:2400;
    const dimensions=fitImage(width,height,maxEdge);
    if(['image/jpeg','image/png'].includes(file.type)&&file.size<=target&&Math.max(width,height)<=maxEdge)return file;
    canvas=document.createElement('canvas');
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Este navegador no puede comprimir imágenes. Prueba con una foto más pequeña.');
    let best;
    for(let attempt=0;attempt<8;attempt++) {
      canvas.width=Math.max(1,Math.round(dimensions.width*0.8**attempt));
      canvas.height=Math.max(1,Math.round(dimensions.height*0.8**attempt));
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [0.85,0.72,0.58]) {
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se ha podido comprimir la imagen. Prueba a exportarla como JPG.')),'image/jpeg',quality));
        if(blob.type!=='image/jpeg')throw new Error('El navegador no admite convertir esta imagen a JPG.');
        if(!best||blob.size<best.size)best=blob;
        if(blob.size<=target)return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
      }
    }
    if(best?.size<=limit)return new File([best],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
    throw new Error('No se ha podido reducir la imagen al tamaño permitido. Selecciona otra foto.');
  } finally {image.close?.();if(canvas){canvas.width=0;canvas.height=0;}}
}
