import test from 'node:test';
import assert from 'node:assert/strict';
import { fitImage,prepareUpload } from '../frontend/src/image-upload.js';
function mockBitmap(t,fn){const previous=globalThis.createImageBitmap;globalThis.createImageBitmap=fn;t.after(()=>{if(previous===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=previous;});}

test('reduce fotos verticales y horizontales sin deformarlas ni ampliar las pequeñas',()=>{
 assert.deepEqual(fitImage(6000,4000,1600),{width:1600,height:1067});
 assert.deepEqual(fitImage(3000,4000,1600),{width:1200,height:1600});
 assert.deepEqual(fitImage(100,200,1600),{width:100,height:200});
 assert.throws(()=>fitImage(0,100,1600));
});
test('PDF conserva sus bytes y sigue sujeto a su límite; no se acepta como foto',async()=>{
 const pdf=new File(['%PDF-test'],'partida.pdf',{type:'application/pdf'});
 assert.equal(await prepareUpload(pdf,'document'),pdf);
 await assert.rejects(prepareUpload(pdf,'photo'),/Selecciona una imagen/);
 await assert.rejects(prepareUpload(new File([new Uint8Array(6*1024*1024)],'partida.pdf',{type:'application/pdf'}),'document'),/5 MB/);
});
test('una foto de cámara grande se convierte en JPG dentro del límite y libera recursos',async t=>{
 let closed=false,drawSize;
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(_image,_x,_y,w,h){drawSize=[w,h];}}),toBlob:cb=>cb(new Blob([new Uint8Array(300000)],{type:'image/jpeg'}))};
 mockBitmap(t,async()=>({width:6000,height:4000,close(){closed=true;}}));
 const originalDocument=globalThis.document;
 globalThis.document={createElement:()=>canvas};t.after(()=>{globalThis.document=originalDocument;});
 const original=new File([new Uint8Array(8*1024*1024)],'camara.png',{type:'image/png'});
 const result=await prepareUpload(original,'photo');
 assert.equal(result.name,'camara.jpg');assert.equal(result.type,'image/jpeg');assert.equal(result.size,300000);
 assert.deepEqual(drawSize,[1600,1067]);assert.ok(closed);assert.equal(canvas.width,0);
});
test('la compresión reduce más la resolución si la primera pasada todavía pesa demasiado',async t=>{
 let attempts=0,closed=false;
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toBlob:cb=>{attempts++;cb(new Blob([new Uint8Array(canvas.width>1280?3*1024*1024:200000)],{type:'image/jpeg'}));}};
 mockBitmap(t,async()=>({width:6000,height:4000,close(){closed=true;}}));
 const originalDocument=globalThis.document;
 globalThis.document={createElement:()=>canvas};t.after(()=>{globalThis.document=originalDocument;});
 const result=await prepareUpload(new File(['data'],'movil.webp',{type:'image/webp'}),'photo');
 assert.equal(attempts,4);assert.equal(result.size,200000);assert.ok(closed);
});
test('un fallo de codificación se muestra y libera la imagen decodificada',async t=>{
 let closed=false;
 mockBitmap(t,async()=>({width:3000,height:4000,close(){closed=true;}}));
 const originalDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:cb=>cb(null)})};t.after(()=>{globalThis.document=originalDocument;});
 await assert.rejects(prepareUpload(new File(['data'],'foto.png',{type:'image/png'}),'photo'),/No se ha podido comprimir/);
 assert.ok(closed);
});
