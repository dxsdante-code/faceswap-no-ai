// js/utils.js
export function toImageBitmapFromFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>createImageBitmap(img).then(resolve).catch(reject);
      img.onerror=reject;img.src=reader.result;
    };
    reader.onerror=reject;reader.readAsDataURL(file);
  });
}

export function drawImageToCanvas(imgBitmap, canvas){
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(imgBitmap,0,0);
}

export function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
