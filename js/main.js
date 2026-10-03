// js/main.js (updated to use YuNet detector)
import {inicializarDetector, obtenerCaraPrincipal, obtenerTodasLasCaras, debugInfo} from './detector.js';
import {wireUI} from './ui.js';
import * as history from './history.js';
import {applySwap} from './swapper.js';

window.onOpenCvReady = async function(){
  console.log('OpenCV.js cargado');
  document.getElementById('statusBar').textContent = 'Inicializando YuNet...';
  try{
    await inicializarDetector({modelPath:'/models/face_detection_yunet_2023mar.onnx', inputSize:[320,320], scoreThreshold:0.75});
    document.getElementById('statusBar').textContent = 'Modelo YuNet cargado.';
  }catch(e){
    console.error(e);
    document.getElementById('statusBar').textContent = 'Error cargando YuNet: '+e.message;
  }
};

(async function(){
  const statusEl = document.getElementById('statusBar');
  const ui = wireUI({
    onSourceLoaded: (canvas)=>{ statusEl.textContent='Fuente cargada'; },
    onTargetLoaded: (canvas)=>{ statusEl.textContent='Destino cargado'; },
    onSwap: async ()=>{
      try{
        statusEl.textContent='Detectando rostros (YuNet)...';
        const srcCanvas = document.getElementById('sourcePreview');
        const dstCanvas = document.getElementById('targetPreview');
        const srcFaces = obtenerTodasLasCaras(srcCanvas);
        const dstFaces = obtenerTodasLasCaras(dstCanvas);

        if(!srcFaces || srcFaces.length===0 || !dstFaces || dstFaces.length===0){
          alert('No se detectaron rostros en una de las imágenes.');
          statusEl.textContent='No se encontraron rostros.';
          return;
        }

        if(srcFaces.length>1 || dstFaces.length>1){
          statusEl.textContent = `Se detectaron múltiples rostros. Usando la de mayor confianza (score).`;
        }

        // seleccionar principal
        const srcFace = srcFaces[0];
        const dstFace = dstFaces[0];

        statusEl.textContent='Alineando y procesando...';
        const options = {feather: parseInt(document.getElementById('featherRange').value,10), blend: parseFloat(document.getElementById('blendRange').value), autoAlign: document.getElementById('autoAlign').checked};

        // convert landmarks format expected by swapper (normalized array)
        // yunet provides landmarks in absolute pixel coords; swapper expects normalized (x in 0..1)
        function toNormalized(landmarks, canvas){
          return landmarks.map(p=>({x:p.x / canvas.width, y:p.y / canvas.height}));
        }

        const outMat = applySwap(document.getElementById('sourcePreview'), document.getElementById('targetPreview'), toNormalized(srcFace.landmarks, document.getElementById('sourcePreview')), toNormalized(dstFace.landmarks, document.getElementById('targetPreview')), options);
        if(outMat){
          cv.imshow('resultCanvas', outMat);
          const dataUrl = document.getElementById('resultCanvas').toDataURL('image/png');
          history.pushState(dataUrl);
          outMat.delete();
          statusEl.textContent='Listo';
        }
      }catch(e){
        console.error(e);
        alert('Error en FaceSwap: '+e.message);
        statusEl.textContent='Error';
      }
    },
    onDownload: ()=>{
      const fmt = document.getElementById('exportFormat').value; const quality = 0.92;
      const canvas = document.getElementById('resultCanvas'); if(!canvas || canvas.width===0){ alert('No hay resultado para descargar'); return; }
      const mime = fmt==='png'?'image/png':(fmt==='jpeg'?'image/jpeg':'image/webp');
      const link = document.createElement('a'); link.href = canvas.toDataURL(mime, quality); link.download = 'faceswap.'+(fmt==='jpeg'?'jpg':fmt); link.click();
    },
    onUndo: ()=>{ if(history.canUndo()){ const url = history.undo(); const img = new Image(); img.onload=()=>{ const c=document.getElementById('resultCanvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0); }; img.src=url; } },
    onRedo: ()=>{ if(history.canRedo()){ const url = history.redo(); const img = new Image(); img.onload=()=>{ const c=document.getElementById('resultCanvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0); }; img.src=url; } }
  });

})();
